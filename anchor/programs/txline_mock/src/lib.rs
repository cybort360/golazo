use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

declare_id!("Go73N2JanmNjxJz7rGdTcd1PzgTZCuM9uRC11jvQGV7w");

// Domain-separated, sorted-pair Merkle hashing. MUST stay byte-for-byte identical
// to lib/txline/merkle.ts so a proof built in TypeScript verifies here.
const LEAF_PREFIX: u8 = 0x00;
const NODE_PREFIX: u8 = 0x01;
const SEP: u8 = 0x1f;

fn leaf_hash(match_id: &str, stat_key: &str, claimed_value: u64) -> [u8; 32] {
    let mut bytes = vec![LEAF_PREFIX];
    bytes.extend_from_slice(match_id.as_bytes());
    bytes.push(SEP);
    bytes.extend_from_slice(stat_key.as_bytes());
    bytes.push(SEP);
    bytes.extend_from_slice(&claimed_value.to_le_bytes());
    hash(&bytes).to_bytes()
}

fn hash_node(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
    let mut bytes = vec![NODE_PREFIX];
    bytes.extend_from_slice(lo);
    bytes.extend_from_slice(hi);
    hash(&bytes).to_bytes()
}

fn compute_root(leaf: [u8; 32], proof: &[[u8; 32]]) -> [u8; 32] {
    let mut computed = leaf;
    for sib in proof {
        computed = hash_node(&computed, sib);
    }
    computed
}

#[program]
pub mod txline_mock {
    use super::*;

    /// The demo oracle authority publishes the signed Merkle root for a match.
    /// In real TxLINE this root is attested by the data provider; here the
    /// post_root signer is the trusted oracle. The CPI shape stays the same.
    pub fn post_root(ctx: Context<PostRoot>, match_id: String, root: [u8; 32]) -> Result<()> {
        let mr = &mut ctx.accounts.match_root;
        mr.match_id = match_id;
        mr.root = root;
        mr.oracle = ctx.accounts.oracle.key();
        Ok(())
    }

    /// Permissionless result validation: recompute the leaf from the claimed
    /// stat, walk the proof to a root, and require it equals the stored root.
    pub fn validate_stat(
        ctx: Context<ValidateStat>,
        match_id: String,
        stat_key: String,
        claimed_value: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        require!(
            ctx.accounts.match_root.match_id == match_id,
            TxlineError::MatchMismatch
        );
        let leaf = leaf_hash(&match_id, &stat_key, claimed_value);
        let computed = compute_root(leaf, &proof);
        require!(
            computed == ctx.accounts.match_root.root,
            TxlineError::InvalidProof
        );
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct PostRoot<'info> {
    #[account(mut)]
    pub oracle: Signer<'info>,
    #[account(
        init_if_needed,
        payer = oracle,
        space = 8 + MatchRoot::SPACE,
        seeds = [b"root", match_id.as_bytes()],
        bump
    )]
    pub match_root: Account<'info, MatchRoot>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct ValidateStat<'info> {
    #[account(seeds = [b"root", match_id.as_bytes()], bump)]
    pub match_root: Account<'info, MatchRoot>,
}

#[account]
pub struct MatchRoot {
    pub match_id: String,
    pub root: [u8; 32],
    pub oracle: Pubkey,
}
impl MatchRoot {
    // 4 + 64 (match_id up to 64 bytes) + 32 (root) + 32 (oracle)
    pub const SPACE: usize = (4 + 64) + 32 + 32;
}

#[error_code]
pub enum TxlineError {
    #[msg("match id mismatch")]
    MatchMismatch,
    #[msg("invalid merkle proof")]
    InvalidProof,
}
