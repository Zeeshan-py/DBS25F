using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Models;

namespace WholesaleDealer.Api.Data;

public sealed class WholesaleDealerDbContext(DbContextOptions<WholesaleDealerDbContext> options)
    : DbContext(options)
{
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Merchant> Merchants => Set<Merchant>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Country>(entity =>
        {
            entity.ToTable("countries", table =>
            {
                table.HasCheckConstraint("chk_countries_code_positive", "`code` > 0");
                table.HasCheckConstraint("chk_countries_name_not_blank", "CHAR_LENGTH(TRIM(`name`)) > 0");
            });
            entity.HasKey(x => x.Code).HasName("pk_countries");
            entity.Property(x => x.Code).HasColumnName("code").ValueGeneratedNever();
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(x => x.ContinentName).HasColumnName("continent_name").HasMaxLength(50).IsRequired();
            entity.HasIndex(x => x.Name).IsUnique().HasDatabaseName("uq_countries_name");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users", table =>
            {
                table.HasCheckConstraint("chk_users_gender", "`gender` IN ('Male', 'Female', 'Other', 'Prefer not to say')");
                table.HasCheckConstraint("chk_users_email_shape", "`email` LIKE '%_@_%._%'");
            });
            entity.HasKey(x => x.Id).HasName("pk_users");
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(120).IsRequired();
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(160).IsRequired();
            entity.Property(x => x.Gender).HasColumnName("gender").HasMaxLength(20).IsRequired();
            entity.Property(x => x.DateOfBirth).HasColumnName("date_of_birth").HasMaxLength(10).IsRequired();
            entity.Property(x => x.CountryCode).HasColumnName("country_code");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasMaxLength(19).IsRequired();
            entity.HasIndex(x => x.Email).IsUnique().HasDatabaseName("uq_users_email");
            entity.HasIndex(x => x.CountryCode).HasDatabaseName("idx_users_country_code");
            entity.HasIndex(x => x.FullName).HasDatabaseName("idx_users_full_name");
            entity.HasOne(x => x.Country)
                .WithMany(x => x.Users)
                .HasForeignKey(x => x.CountryCode)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_users_country");
        });

        modelBuilder.Entity<Merchant>(entity =>
        {
            entity.ToTable("merchants");
            entity.HasKey(x => x.Id).HasName("pk_merchants");
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.MerchantName).HasColumnName("merchant_name").HasMaxLength(120).IsRequired();
            entity.Property(x => x.AdminId).HasColumnName("admin_id");
            entity.Property(x => x.CountryCode).HasColumnName("country_code");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasMaxLength(19).IsRequired();
            entity.HasIndex(x => x.MerchantName).IsUnique().HasDatabaseName("uq_merchants_name");
            entity.HasIndex(x => x.AdminId).HasDatabaseName("idx_merchants_admin_id");
            entity.HasIndex(x => x.CountryCode).HasDatabaseName("idx_merchants_country_code");
            entity.HasOne(x => x.Admin)
                .WithMany(x => x.AdministeredMerchants)
                .HasForeignKey(x => x.AdminId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_merchants_admin");
            entity.HasOne(x => x.Country)
                .WithMany(x => x.Merchants)
                .HasForeignKey(x => x.CountryCode)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_merchants_country");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products", table =>
            {
                table.HasCheckConstraint("chk_products_price_positive", "`price` > 0");
                table.HasCheckConstraint("chk_products_status", "`status` IN ('Active', 'Inactive', 'Out of Stock')");
            });
            entity.HasKey(x => x.Id).HasName("pk_products");
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.MerchantId).HasColumnName("merchant_id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(140).IsRequired();
            entity.Property(x => x.Price).HasColumnName("price");
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasMaxLength(19).IsRequired();
            entity.HasIndex(x => new { x.MerchantId, x.Name }).IsUnique().HasDatabaseName("uq_products_merchant_name");
            entity.HasIndex(x => x.MerchantId).HasDatabaseName("idx_products_merchant_id");
            entity.HasIndex(x => x.Status).HasDatabaseName("idx_products_status");
            entity.HasOne(x => x.Merchant)
                .WithMany(x => x.Products)
                .HasForeignKey(x => x.MerchantId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_products_merchant");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders", table =>
                table.HasCheckConstraint("chk_orders_status", "`status` IN ('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled')"));
            entity.HasKey(x => x.Id).HasName("pk_orders");
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasMaxLength(19).IsRequired();
            entity.HasIndex(x => x.UserId).HasDatabaseName("idx_orders_user_id");
            entity.HasIndex(x => x.Status).HasDatabaseName("idx_orders_status");
            entity.HasIndex(x => x.CreatedAt).HasDatabaseName("idx_orders_created_at");
            entity.HasOne(x => x.User)
                .WithMany(x => x.Orders)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_orders_user");
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items", table =>
                table.HasCheckConstraint("chk_order_items_quantity_positive", "`quantity` > 0"));
            entity.HasKey(x => new { x.OrderId, x.ProductId }).HasName("pk_order_items");
            entity.Property(x => x.OrderId).HasColumnName("order_id");
            entity.Property(x => x.ProductId).HasColumnName("product_id");
            entity.Property(x => x.Quantity).HasColumnName("quantity");
            entity.HasIndex(x => x.ProductId).HasDatabaseName("idx_order_items_product_id");
            entity.HasOne(x => x.Order)
                .WithMany(x => x.OrderItems)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_order_items_order");
            entity.HasOne(x => x.Product)
                .WithMany(x => x.OrderItems)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fk_order_items_product");
        });
    }
}
