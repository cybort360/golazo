/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/txline_mock.json`.
 */
export type TxlineMock = {
  "address": "Go73N2JanmNjxJz7rGdTcd1PzgTZCuM9uRC11jvQGV7w",
  "metadata": {
    "name": "txlineMock",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "TxLINE validate_stat stand-in: signed Merkle root per match"
  },
  "instructions": [
    {
      "name": "postRoot",
      "docs": [
        "The demo oracle authority publishes the signed Merkle root for a match.",
        "In real TxLINE this root is attested by the data provider; here the",
        "post_root signer is the trusted oracle. The CPI shape stays the same."
      ],
      "discriminator": [
        154,
        210,
        156,
        158,
        199,
        27,
        174,
        35
      ],
      "accounts": [
        {
          "name": "oracle",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchRoot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "string"
        },
        {
          "name": "root",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "validateStat",
      "docs": [
        "Permissionless result validation: recompute the leaf from the claimed",
        "stat, walk the proof to a root, and require it equals the stored root."
      ],
      "discriminator": [
        107,
        197,
        232,
        90,
        191,
        136,
        105,
        185
      ],
      "accounts": [
        {
          "name": "matchRoot",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "string"
        },
        {
          "name": "statKey",
          "type": "string"
        },
        {
          "name": "claimedValue",
          "type": "u64"
        },
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "matchRoot",
      "discriminator": [
        119,
        102,
        86,
        31,
        98,
        20,
        62,
        35
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "matchMismatch",
      "msg": "match id mismatch"
    },
    {
      "code": 6001,
      "name": "invalidProof",
      "msg": "invalid merkle proof"
    }
  ],
  "types": [
    {
      "name": "matchRoot",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "string"
          },
          {
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "oracle",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
