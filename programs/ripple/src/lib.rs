//! Minimal Anchor program for Rivo: buyer signs a `purchase` that transfers SOL to a creator.
//! The web app MVP verifies native `SystemProgram::transfer` instructions; this program is the
//! on-chain core you can route through after `anchor build` + `anchor deploy`.
//!
//! After deploy, run `anchor keys sync` so `declare_id!` matches your keypair, or replace the ID below.

use anchor_lang::prelude::*;

declare_id!("EaEq7oukxo1VA75P5zr8jCVZjNesF7ZavWy2A9QKAqTp");

#[program]
pub mod Rivo {
    use super::*;

    /// Transfers `amount` lamports from buyer (signer) to creator.
    pub fn purchase(ctx: Context<Purchase>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.creator.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_ctx, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: creator wallet receiving SOL
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be positive")]
    ZeroAmount,
}
