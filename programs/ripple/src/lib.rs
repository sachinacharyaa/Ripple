//! Ripple — creator products on-chain with validated SOL payment to creator.
//! Payment is a program-mediated transfer for exactly `product.price` lamports (not a separate escrow vault).

use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod ripple {
    use super::*;

    /// Register a product. `metadata_uri` should resolve to JSON (e.g. IPFS) with title, description, contentUrl.
    pub fn create_product(
        ctx: Context<CreateProduct>,
        product_id: u64,
        price_lamports: u64,
        content_hash: [u8; 32],
        metadata_uri: String,
    ) -> Result<()> {
        require!(price_lamports > 0, ErrorCode::InvalidPrice);
        require!(metadata_uri.len() <= 200, ErrorCode::UriTooLong);

        let product = &mut ctx.accounts.product;
        product.creator = ctx.accounts.creator.key();
        product.id = product_id;
        product.price = price_lamports;
        product.content_hash = content_hash;
        product.metadata_uri = metadata_uri;
        product.bump = ctx.bumps.product;
        Ok(())
    }

    /// Buyer pays the creator **exactly** `product.price` lamports; initializes a purchase receipt PDA.
    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        let product = &ctx.accounts.product;
        require!(
            ctx.accounts.buyer.key() != product.creator,
            ErrorCode::CannotBuyOwnProduct
        );

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.creator.to_account_info(),
                },
            ),
            product.price,
        )?;

        let record = &mut ctx.accounts.purchase_record;
        record.buyer = ctx.accounts.buyer.key();
        record.product = ctx.accounts.product.key();
        record.amount_lamports = product.price;
        record.bump = ctx.bumps.purchase_record;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Product {
    pub creator: Pubkey,
    pub id: u64,
    pub price: u64,
    pub content_hash: [u8; 32],
    pub bump: u8,
    #[max_len(200)]
    pub metadata_uri: String,
}

#[account]
#[derive(InitSpace)]
pub struct PurchaseRecord {
    pub buyer: Pubkey,
    pub product: Pubkey,
    pub amount_lamports: u64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(product_id: u64)]
pub struct CreateProduct<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + Product::INIT_SPACE,
        seeds = [b"product", creator.key().as_ref(), &product_id.to_le_bytes()],
        bump
    )]
    pub product: Account<'info, Product>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: lamports receiver — must match on-chain product creator
    #[account(mut, constraint = creator.key() == product.creator @ ErrorCode::InvalidCreator)]
    pub creator: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"product", product.creator.as_ref(), &product.id.to_le_bytes()],
        bump = product.bump,
    )]
    pub product: Account<'info, Product>,
    #[account(
        init,
        payer = buyer,
        space = 8 + PurchaseRecord::INIT_SPACE,
        seeds = [b"purchase", buyer.key().as_ref(), product.key().as_ref()],
        bump
    )]
    pub purchase_record: Account<'info, PurchaseRecord>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Price must be positive")]
    InvalidPrice,
    #[msg("Metadata URI too long (max 200 chars)")]
    UriTooLong,
    #[msg("Creator wallet does not match product")]
    InvalidCreator,
    #[msg("Creators cannot purchase their own product")]
    CannotBuyOwnProduct,
}
