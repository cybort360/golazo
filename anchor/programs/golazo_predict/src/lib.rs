use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};
use txline_mock::cpi::accounts::ValidateStat as TxValidateStat;
use txline_mock::program::TxlineMock;

declare_id!("GJNVa5XpYWUaJnbxx4TmepNM4D9JDAoCSC2FCRmRWGA5");

pub const GOLAZO_DECIMALS: u8 = 6;

// Binary market sides.
pub const SIDE_NO: u8 = 0;
pub const SIDE_YES: u8 = 1;

// Market status lifecycle. Live/Settling are UI-facing intermediate states a
// keeper may set; the on-chain guards that matter are: stake only while Open and
// before lock_ts; settle only once (keeper-gated); refund only when Void.
pub const ST_OPEN: u8 = 0;
pub const ST_LOCKED: u8 = 1;
pub const ST_LIVE: u8 = 2;
pub const ST_SETTLING: u8 = 3;
pub const ST_SETTLED: u8 = 4;
pub const ST_VOID: u8 = 5;

#[program]
pub mod golazo_predict {
    use super::*;

    /// Create the devnet mock SPL mint ("GOLAZO demo credits") with a PDA
    /// mint authority. Demo settlement asset only — never real money.
    pub fn init_mint(_ctx: Context<InitMint>) -> Result<()> {
        Ok(())
    }

    /// Free devnet faucet: mint demo GOLAZO to the caller's ATA.
    pub fn faucet(ctx: Context<Faucet>, amount: u64) -> Result<()> {
        let bump = ctx.bumps.mint_authority;
        let seeds: &[&[u8]] = &[b"mint_auth", &[bump]];
        let signer = &[seeds];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.user_ata.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;
        Ok(())
    }

    /// Open a YES/NO market for a match. The creator becomes the keeper that can
    /// lock / settle / void it.
    pub fn init_market(
        ctx: Context<InitMarket>,
        match_id: String,
        market_id: String,
        question: String,
        lock_ts: i64,
    ) -> Result<()> {
        require!(match_id.len() <= 32, GolazoError::StringTooLong);
        require!(market_id.len() <= 16, GolazoError::StringTooLong);
        require!(question.len() <= 96, GolazoError::StringTooLong);
        let m = &mut ctx.accounts.market;
        m.match_id = match_id;
        m.market_id = market_id;
        m.question = question;
        m.status = ST_OPEN;
        m.winning_side = 0;
        m.lock_ts = lock_ts;
        m.yes_total = 0;
        m.no_total = 0;
        m.mint = ctx.accounts.mint.key();
        m.vault = ctx.accounts.vault.key();
        m.keeper = ctx.accounts.creator.key();
        m.bump = ctx.bumps.market;
        Ok(())
    }

    /// Stake GOLAZO on YES or NO. Rejected once the market is locked or past
    /// its kickoff lock time.
    pub fn stake(ctx: Context<Stake>, side: u8, amount: u64) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status == ST_OPEN, GolazoError::MarketClosed);
        require!(side == SIDE_YES || side == SIDE_NO, GolazoError::BadSide);
        require!(amount > 0, GolazoError::ZeroAmount);
        let now = Clock::get()?.unix_timestamp;
        require!(now < m.lock_ts, GolazoError::MarketLocked);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_ata.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        let pos = &mut ctx.accounts.position;
        if pos.amount == 0 {
            pos.market = m.key();
            pos.user = ctx.accounts.user.key();
            pos.side = side;
            pos.claimed = false;
        } else {
            require!(pos.side == side, GolazoError::SideConflict);
        }
        pos.amount = pos.amount.checked_add(amount).unwrap();
        if side == SIDE_YES {
            m.yes_total = m.yes_total.checked_add(amount).unwrap();
        } else {
            m.no_total = m.no_total.checked_add(amount).unwrap();
        }
        Ok(())
    }

    /// Keeper advances market status (Open -> Locked -> Live -> Settling). Used
    /// by the live-stream keeper; does not affect funds.
    pub fn set_status(ctx: Context<KeeperOnly>, status: u8) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status < ST_SETTLED, GolazoError::MarketClosed);
        require!(status <= ST_SETTLING, GolazoError::BadStatus);
        m.status = status;
        Ok(())
    }

    /// Keeper-gated settlement. Performs a real CPI into
    /// `txline_mock::validate_stat`; only on a verified Merkle proof does the
    /// market become Settled with the winning side recorded.
    pub fn settle(ctx: Context<Settle>, claimed_value: u64, proof: Vec<[u8; 32]>) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status != ST_SETTLED && m.status != ST_VOID, GolazoError::MarketClosed);
        require!(claimed_value <= 1, GolazoError::BadSide);

        txline_mock::cpi::validate_stat(
            CpiContext::new(
                ctx.accounts.txline_program.to_account_info(),
                TxValidateStat {
                    match_root: ctx.accounts.match_root.to_account_info(),
                },
            ),
            m.match_id.clone(),
            m.market_id.clone(),
            claimed_value,
            proof,
        )?;

        m.winning_side = claimed_value as u8;
        m.status = ST_SETTLED;
        Ok(())
    }

    /// Keeper voids a market (postponed / abandoned / unresolved). Stakers
    /// reclaim their own deposits via `refund`.
    pub fn void(ctx: Context<KeeperOnly>) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(m.status != ST_SETTLED, GolazoError::MarketClosed);
        m.status = ST_VOID;
        Ok(())
    }

    /// Winners claim a pro-rata share of the whole pool. If nobody backed the
    /// winning side, every staker can reclaim their own deposit instead.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let m = &ctx.accounts.market;
        require!(m.status == ST_SETTLED, GolazoError::NotSettled);
        let pos = &mut ctx.accounts.position;
        require!(!pos.claimed, GolazoError::AlreadyClaimed);

        let total = m.yes_total.checked_add(m.no_total).unwrap();
        let win_total = if m.winning_side == SIDE_YES { m.yes_total } else { m.no_total };
        let payout: u64 = if win_total == 0 {
            pos.amount // no winners: refund own stake
        } else {
            require!(pos.side == m.winning_side, GolazoError::NotWinner);
            ((pos.amount as u128) * (total as u128) / (win_total as u128)) as u64
        };

        transfer_from_vault(&ctx.accounts.vault, &ctx.accounts.user_ata, m, &ctx.accounts.market, &ctx.accounts.token_program, payout)?;
        pos.claimed = true;
        Ok(())
    }

    /// Refund a staker's own deposit from a voided market.
    pub fn refund(ctx: Context<Claim>) -> Result<()> {
        let m = &ctx.accounts.market;
        require!(m.status == ST_VOID, GolazoError::NotVoid);
        let pos = &mut ctx.accounts.position;
        require!(!pos.claimed, GolazoError::AlreadyClaimed);
        let amount = pos.amount;
        transfer_from_vault(&ctx.accounts.vault, &ctx.accounts.user_ata, m, &ctx.accounts.market, &ctx.accounts.token_program, amount)?;
        pos.claimed = true;
        Ok(())
    }
}

fn transfer_from_vault<'info>(
    vault: &Account<'info, TokenAccount>,
    user_ata: &Account<'info, TokenAccount>,
    market: &Market,
    market_acc: &Account<'info, Market>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    let match_id = market.match_id.clone();
    let market_id = market.market_id.clone();
    let bump = market.bump;
    let seeds: &[&[u8]] = &[b"market", match_id.as_bytes(), market_id.as_bytes(), &[bump]];
    let signer = &[seeds];
    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: user_ata.to_account_info(),
                authority: market_acc.to_account_info(),
            },
            signer,
        ),
        amount,
    )
}

#[derive(Accounts)]
pub struct InitMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: PDA mint authority
    #[account(seeds = [b"mint_auth"], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        mint::decimals = GOLAZO_DECIMALS,
        mint::authority = mint_authority,
        seeds = [b"golazo_mint"],
        bump
    )]
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Faucet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"golazo_mint"], bump)]
    pub mint: Account<'info, Mint>,
    /// CHECK: PDA mint authority
    #[account(seeds = [b"mint_auth"], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub user_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: String, market_id: String)]
pub struct InitMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(seeds = [b"golazo_mint"], bump)]
    pub mint: Account<'info, Mint>,
    #[account(
        init, payer = creator, space = 8 + Market::SPACE,
        seeds = [b"market", match_id.as_bytes(), market_id.as_bytes()], bump
    )]
    pub market: Account<'info, Market>,
    #[account(
        init, payer = creator,
        token::mint = mint, token::authority = market,
        seeds = [b"vault", market.key().as_ref()], bump
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"market", market.match_id.as_bytes(), market.market_id.as_bytes()], bump = market.bump)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed, payer = user, space = 8 + Position::SPACE,
        seeds = [b"pos", market.key().as_ref(), user.key().as_ref()], bump
    )]
    pub position: Account<'info, Position>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct KeeperOnly<'info> {
    pub keeper: Signer<'info>,
    #[account(
        mut,
        seeds = [b"market", market.match_id.as_bytes(), market.market_id.as_bytes()], bump = market.bump,
        constraint = market.keeper == keeper.key() @ GolazoError::NotKeeper
    )]
    pub market: Account<'info, Market>,
}

#[derive(Accounts)]
pub struct Settle<'info> {
    pub keeper: Signer<'info>,
    #[account(
        mut,
        seeds = [b"market", market.match_id.as_bytes(), market.market_id.as_bytes()], bump = market.bump,
        constraint = market.keeper == keeper.key() @ GolazoError::NotKeeper
    )]
    pub market: Account<'info, Market>,
    /// CHECK: validated inside the CPI by seeds in txline_mock
    pub match_root: UncheckedAccount<'info>,
    pub txline_program: Program<'info, TxlineMock>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(seeds = [b"market", market.match_id.as_bytes(), market.market_id.as_bytes()], bump = market.bump)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(
        mut, seeds = [b"pos", market.key().as_ref(), user.key().as_ref()], bump,
        constraint = position.user == user.key() @ GolazoError::NotWinner
    )]
    pub position: Account<'info, Position>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Market {
    pub match_id: String,
    pub market_id: String,
    pub question: String,
    pub status: u8,
    pub winning_side: u8,
    pub lock_ts: i64,
    pub yes_total: u64,
    pub no_total: u64,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub keeper: Pubkey,
    pub bump: u8,
}
impl Market {
    pub const SPACE: usize =
        (4 + 32) + (4 + 16) + (4 + 96) + 1 + 1 + 8 + 8 + 8 + 32 + 32 + 32 + 1;
}

#[account]
pub struct Position {
    pub market: Pubkey,
    pub user: Pubkey,
    pub side: u8,
    pub amount: u64,
    pub claimed: bool,
}
impl Position {
    pub const SPACE: usize = 32 + 32 + 1 + 8 + 1;
}

#[error_code]
pub enum GolazoError {
    #[msg("string too long")]
    StringTooLong,
    #[msg("bad side (must be 0=NO or 1=YES)")]
    BadSide,
    #[msg("bad status")]
    BadStatus,
    #[msg("market is locked")]
    MarketLocked,
    #[msg("market is closed/settled")]
    MarketClosed,
    #[msg("zero amount")]
    ZeroAmount,
    #[msg("position side conflict")]
    SideConflict,
    #[msg("market not settled")]
    NotSettled,
    #[msg("market not void")]
    NotVoid,
    #[msg("already claimed")]
    AlreadyClaimed,
    #[msg("not a winner")]
    NotWinner,
    #[msg("not the keeper")]
    NotKeeper,
}
