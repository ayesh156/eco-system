"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting seed...');
    // ==========================================
    // CATEGORIES - Matching mockData categories
    // ==========================================
    const categoryData = [
        { name: 'Processors', description: 'CPUs and processors' },
        { name: 'Graphics Cards', description: 'GPUs and video cards' },
        { name: 'Storage', description: 'SSDs, HDDs and storage devices' },
        { name: 'Memory', description: 'RAM modules and memory' },
        { name: 'Motherboards', description: 'Motherboards for desktops and laptops' },
        { name: 'Power Supply', description: 'PSUs and power supplies' },
        { name: 'Cooling', description: 'Coolers, fans and thermal solutions' },
        { name: 'Cases', description: 'PC cases and enclosures' },
        { name: 'Monitors', description: 'Display monitors' },
        { name: 'Peripherals', description: 'Keyboards, mice, headsets etc.' },
    ];
    const categories = {};
    for (const cat of categoryData) {
        const category = await prisma.category.upsert({
            where: { name: cat.name },
            update: {},
            create: cat,
        });
        categories[cat.name] = category;
    }
    console.log(`✅ Created ${Object.keys(categories).length} categories`);
    // ==========================================
    // BRANDS - Matching mockData brands
    // ==========================================
    const brandData = [
        { name: 'AMD', description: 'Advanced Micro Devices' },
        { name: 'Intel', description: 'Intel Corporation' },
        { name: 'NVIDIA', description: 'NVIDIA Corporation' },
        { name: 'Samsung', description: 'Samsung Electronics' },
        { name: 'Western Digital', description: 'Western Digital Corporation' },
        { name: 'Corsair', description: 'Corsair Gaming' },
        { name: 'G.Skill', description: 'G.Skill International' },
        { name: 'ASUS', description: 'ASUSTeK Computer' },
        { name: 'MSI', description: 'Micro-Star International' },
        { name: 'NZXT', description: 'NZXT Inc.' },
        { name: 'Lian Li', description: 'Lian Li Industrial' },
        { name: 'LG', description: 'LG Electronics' },
        { name: 'Logitech', description: 'Logitech International' },
        { name: 'Razer', description: 'Razer Inc.' },
        { name: 'SteelSeries', description: 'SteelSeries ApS' },
        { name: 'Seagate', description: 'Seagate Technology' },
    ];
    const brands = {};
    for (const brand of brandData) {
        const b = await prisma.brand.upsert({
            where: { name: brand.name },
            update: {},
            create: brand,
        });
        brands[brand.name] = b;
    }
    console.log(`✅ Created ${Object.keys(brands).length} brands`);
    // ==========================================
    // CUSTOMERS - Matching mockCustomers (IDs 1-8)
    // ==========================================
    const customerData = [
        { id: '1', name: 'Kasun Perera', email: 'kasun@gmail.com', phone: '078-3233760', address: 'No. 12, Galle Road, Colombo', totalSpent: 580000, totalOrders: 5, creditBalance: 0, creditLimit: 100000, creditStatus: client_1.CreditStatus.CLEAR },
        { id: '2', name: 'Nimali Fernando', email: 'nimali@email.com', phone: '078-3233760', address: '12A, Kandy Rd, Kurunegala', totalSpent: 320000, totalOrders: 3, creditBalance: 103500, creditLimit: 200000, creditStatus: client_1.CreditStatus.ACTIVE },
        { id: '3', name: 'Tech Solutions Ltd', email: 'info@techsol.lk', phone: '078-3233760', address: 'No. 45, Industrial Estate, Colombo 15', totalSpent: 2500000, totalOrders: 18, creditBalance: 488000, creditLimit: 1000000, creditStatus: client_1.CreditStatus.ACTIVE },
        { id: '4', name: 'Dilshan Silva', email: 'dilshan.s@hotmail.com', phone: '078-3233760', address: '78/2, Hill Street, Kandy', totalSpent: 185000, totalOrders: 2, creditBalance: 72500, creditLimit: 100000, creditStatus: client_1.CreditStatus.ACTIVE },
        { id: '5', name: 'GameZone Café', email: 'contact@gamezone.lk', phone: '078-3233760', address: 'Shop 5, Arcade Mall, Colombo', totalSpent: 3200000, totalOrders: 25, creditBalance: 1231250, creditLimit: 1500000, creditStatus: client_1.CreditStatus.ACTIVE },
        { id: '6', name: 'Priya Jayawardena', email: 'priya.j@yahoo.com', phone: '078-3233760', address: 'No. 7, Lake Road, Galle', totalSpent: 95000, totalOrders: 1, creditBalance: 0, creditLimit: 50000, creditStatus: client_1.CreditStatus.CLEAR },
        { id: '7', name: 'Creative Studios', email: 'studio@creative.lk', phone: '078-3233760', address: 'Studio 3, Art Lane, Colombo', totalSpent: 1850000, totalOrders: 12, creditBalance: 1322500, creditLimit: 1500000, creditStatus: client_1.CreditStatus.ACTIVE },
        { id: '8', name: 'Sanjay Mendis', email: 'sanjay.m@gmail.com', phone: '078-3233760', address: 'No. 21, Thotalanga Road, Colombo', totalSpent: 420000, totalOrders: 4, creditBalance: 0, creditLimit: 100000, creditStatus: client_1.CreditStatus.CLEAR },
    ];
    for (const cust of customerData) {
        await prisma.customer.upsert({
            where: { id: cust.id },
            update: {},
            create: cust,
        });
    }
    console.log(`✅ Created ${customerData.length} customers`);
    // ==========================================
    // PRODUCTS - Matching mockProducts (IDs 1-20)
    // ==========================================
    const productData = [
        { id: '1', name: 'AMD Ryzen 9 7950X', category: 'Processors', brand: 'AMD', price: 185000, costPrice: 155000, stock: 12, serialNumber: '70451234', barcode: '4938271650123', warranty: '3 years' },
        { id: '2', name: 'Intel Core i9-14900K', category: 'Processors', brand: 'Intel', price: 195000, costPrice: 165000, stock: 8, serialNumber: '70452345', barcode: '4938271650124', warranty: '3 years' },
        { id: '3', name: 'NVIDIA GeForce RTX 4090', category: 'Graphics Cards', brand: 'NVIDIA', price: 620000, costPrice: 520000, stock: 5, serialNumber: '70453456', barcode: '4938271650125', warranty: '3 years' },
        { id: '4', name: 'NVIDIA GeForce RTX 4070 Ti', category: 'Graphics Cards', brand: 'NVIDIA', price: 280000, costPrice: 235000, stock: 15, serialNumber: '70454567', barcode: '4938271650126', warranty: '3 years' },
        { id: '5', name: 'AMD Radeon RX 7900 XTX', category: 'Graphics Cards', brand: 'AMD', price: 350000, costPrice: 295000, stock: 7, serialNumber: '70455678', barcode: '4938271650127', warranty: '2 years' },
        { id: '6', name: 'Samsung 990 Pro 2TB NVMe SSD', category: 'Storage', brand: 'Samsung', price: 75000, costPrice: 62000, stock: 30, serialNumber: '70456789', barcode: '4938271650128', warranty: '5 years' },
        { id: '7', name: 'WD Black SN850X 1TB', category: 'Storage', brand: 'Western Digital', price: 42000, costPrice: 34000, stock: 45, serialNumber: '70457890', barcode: '4938271650129', warranty: '5 years' },
        { id: '8', name: 'Corsair Vengeance DDR5 32GB (2x16GB)', category: 'Memory', brand: 'Corsair', price: 48000, costPrice: 40000, stock: 25, serialNumber: '70458901', barcode: '4938271650130', warranty: 'Lifetime' },
        { id: '9', name: 'G.Skill Trident Z5 64GB DDR5', category: 'Memory', brand: 'G.Skill', price: 95000, costPrice: 78000, stock: 10, serialNumber: '70459012', barcode: '4938271650131', warranty: 'Lifetime' },
        { id: '10', name: 'ASUS ROG Maximus Z790 Hero', category: 'Motherboards', brand: 'ASUS', price: 185000, costPrice: 155000, stock: 6, serialNumber: '70460123', barcode: '4938271650132', warranty: '3 years' },
        { id: '11', name: 'MSI MEG Z790 ACE', category: 'Motherboards', brand: 'MSI', price: 165000, costPrice: 138000, stock: 8, serialNumber: '70461234', barcode: '4938271650133', warranty: '3 years' },
        { id: '12', name: 'Corsair RM1000x 1000W PSU', category: 'Power Supply', brand: 'Corsair', price: 55000, costPrice: 45000, stock: 20, serialNumber: '70462345', barcode: '4938271650134', warranty: '10 years' },
        { id: '13', name: 'NZXT Kraken X73 RGB', category: 'Cooling', brand: 'NZXT', price: 75000, costPrice: 62000, stock: 18, serialNumber: '70463456', barcode: '4938271650135', warranty: '6 years' },
        { id: '14', name: 'Lian Li O11 Dynamic EVO', category: 'Cases', brand: 'Lian Li', price: 58000, costPrice: 48000, stock: 12, serialNumber: '70464567', barcode: '4938271650136', warranty: '2 years' },
        { id: '15', name: 'LG UltraGear 27GP950-B 4K Monitor', category: 'Monitors', brand: 'LG', price: 195000, costPrice: 165000, stock: 6, serialNumber: '70465678', barcode: '4938271650137', warranty: '3 years' },
        { id: '16', name: 'Samsung Odyssey G9 49" Monitor', category: 'Monitors', brand: 'Samsung', price: 380000, costPrice: 320000, stock: 3, serialNumber: '70466789', barcode: '4938271650138', warranty: '3 years' },
        { id: '17', name: 'Logitech G Pro X Superlight 2', category: 'Peripherals', brand: 'Logitech', price: 52000, costPrice: 42000, stock: 35, serialNumber: '70467890', barcode: '4938271650139', warranty: '2 years' },
        { id: '18', name: 'Razer Huntsman V3 Pro', category: 'Peripherals', brand: 'Razer', price: 68000, costPrice: 55000, stock: 20, serialNumber: '70468901', barcode: '4938271650140', warranty: '2 years' },
        { id: '19', name: 'SteelSeries Arctis Nova Pro', category: 'Peripherals', brand: 'SteelSeries', price: 95000, costPrice: 78000, stock: 15, serialNumber: '70469012', barcode: '4938271650141', warranty: '1 year' },
        { id: '20', name: 'Seagate Exos 18TB HDD', category: 'Storage', brand: 'Seagate', price: 125000, costPrice: 105000, stock: 8, serialNumber: '70470123', barcode: '4938271650142', warranty: '5 years' },
    ];
    for (const prod of productData) {
        await prisma.product.upsert({
            where: { id: prod.id },
            update: {},
            create: {
                id: prod.id,
                name: prod.name,
                price: prod.price,
                costPrice: prod.costPrice,
                stock: prod.stock,
                serialNumber: prod.serialNumber,
                barcode: prod.barcode,
                warranty: prod.warranty,
                categoryId: categories[prod.category].id,
                brandId: brands[prod.brand].id,
            },
        });
    }
    console.log(`✅ Created ${productData.length} products`);
    // ==========================================
    // INVOICES - Matching mockInvoices (IDs 10260001-10260012)
    // ==========================================
    const invoiceData = [
        {
            id: '10260001',
            invoiceNumber: 'INV-10260001',
            customerId: '1',
            customerName: 'Kasun Perera',
            subtotal: 281000,
            tax: 42150,
            total: 323150,
            paidAmount: 323150,
            dueAmount: 0,
            status: client_1.InvoiceStatus.FULLPAID,
            date: new Date('2026-01-03'),
            dueDate: new Date('2026-01-18'),
            paymentMethod: client_1.PaymentMethod.CARD,
            salesChannel: client_1.SalesChannel.ON_SITE,
            items: [
                { productId: '1', productName: 'AMD Ryzen 9 7950X', quantity: 1, unitPrice: 185000, total: 185000, warrantyDueDate: new Date('2029-01-03') },
                { productId: '8', productName: 'Corsair Vengeance DDR5 32GB', quantity: 2, unitPrice: 48000, total: 96000 },
            ],
        },
        {
            id: '10260002',
            invoiceNumber: 'INV-10260002',
            customerId: '3',
            customerName: 'Tech Solutions Ltd',
            subtotal: 1720000,
            tax: 258000,
            total: 1978000,
            paidAmount: 1978000,
            dueAmount: 0,
            status: client_1.InvoiceStatus.FULLPAID,
            date: new Date('2026-01-05'),
            dueDate: new Date('2026-01-20'),
            paymentMethod: client_1.PaymentMethod.BANK_TRANSFER,
            salesChannel: client_1.SalesChannel.ON_SITE,
            items: [
                { productId: '3', productName: 'NVIDIA GeForce RTX 4090', quantity: 2, unitPrice: 620000, total: 1240000, warrantyDueDate: new Date('2029-01-05') },
                { productId: '10', productName: 'ASUS ROG Maximus Z790 Hero', quantity: 2, unitPrice: 185000, total: 370000, warrantyDueDate: new Date('2029-01-05') },
                { productId: '12', productName: 'Corsair RM1000x 1000W PSU', quantity: 2, unitPrice: 55000, total: 110000, warrantyDueDate: new Date('2036-01-05') },
            ],
        },
        {
            id: '10260003',
            invoiceNumber: 'INV-10260003',
            customerId: '5',
            customerName: 'GameZone Café',
            subtotal: 2375000,
            tax: 356250,
            total: 2731250,
            paidAmount: 1500000,
            dueAmount: 1231250,
            status: client_1.InvoiceStatus.HALFPAY,
            date: new Date('2026-01-08'),
            dueDate: new Date('2026-01-23'),
            paymentMethod: client_1.PaymentMethod.CREDIT,
            salesChannel: client_1.SalesChannel.ONLINE,
            items: [
                { productId: '4', productName: 'NVIDIA GeForce RTX 4070 Ti', quantity: 5, unitPrice: 280000, total: 1400000, warrantyDueDate: new Date('2029-01-08') },
                { productId: '15', productName: 'LG UltraGear 27GP950-B 4K Monitor', quantity: 5, unitPrice: 195000, total: 975000, warrantyDueDate: new Date('2029-01-08') },
            ],
            payments: [
                { amount: 500000, paymentMethod: client_1.PaymentMethod.CASH, paymentDate: new Date('2026-01-08T10:30:00'), notes: 'Initial deposit payment' },
                { amount: 500000, paymentMethod: client_1.PaymentMethod.BANK_TRANSFER, paymentDate: new Date('2026-01-12T14:15:00'), notes: 'Second installment' },
                { amount: 500000, paymentMethod: client_1.PaymentMethod.CARD, paymentDate: new Date('2026-01-16T11:00:00'), notes: 'Third payment via credit card' },
            ],
        },
        {
            id: '10260004',
            invoiceNumber: 'INV-10260004',
            customerId: '2',
            customerName: 'Nimali Fernando',
            subtotal: 120000,
            tax: 18000,
            total: 138000,
            paidAmount: 138000,
            dueAmount: 0,
            status: client_1.InvoiceStatus.FULLPAID,
            date: new Date('2026-01-02'),
            dueDate: new Date('2026-01-17'),
            paymentMethod: client_1.PaymentMethod.CASH,
            salesChannel: client_1.SalesChannel.ON_SITE,
            items: [
                { productId: '17', productName: 'Logitech G Pro X Superlight 2', quantity: 1, unitPrice: 52000, total: 52000, warrantyDueDate: new Date('2028-01-02') },
                { productId: '18', productName: 'Razer Huntsman V3 Pro', quantity: 1, unitPrice: 68000, total: 68000, warrantyDueDate: new Date('2028-01-02') },
            ],
        },
        {
            id: '10260005',
            invoiceNumber: 'INV-10260005',
            customerId: '7',
            customerName: 'Creative Studios',
            subtotal: 1150000,
            tax: 172500,
            total: 1322500,
            paidAmount: 0,
            dueAmount: 1322500,
            status: client_1.InvoiceStatus.UNPAID,
            date: new Date('2026-01-10'),
            dueDate: new Date('2026-01-25'),
            paymentMethod: client_1.PaymentMethod.CREDIT,
            salesChannel: client_1.SalesChannel.ON_SITE,
            items: [
                { productId: '16', productName: 'Samsung Odyssey G9 49" Monitor', quantity: 2, unitPrice: 380000, total: 760000, warrantyDueDate: new Date('2029-01-10') },
                { productId: '2', productName: 'Intel Core i9-14900K', quantity: 2, unitPrice: 195000, total: 390000, warrantyDueDate: new Date('2029-01-10') },
            ],
        },
        {
            id: '10260006',
            invoiceNumber: 'INV-10260006',
            customerId: '4',
            customerName: 'Dilshan Silva',
            subtotal: 150000,
            tax: 22500,
            total: 172500,
            paidAmount: 100000,
            dueAmount: 72500,
            status: client_1.InvoiceStatus.HALFPAY,
            date: new Date('2026-01-06'),
            dueDate: new Date('2026-01-21'),
            paymentMethod: client_1.PaymentMethod.CASH,
            salesChannel: client_1.SalesChannel.ON_SITE,
            items: [
                { productId: '6', productName: 'Samsung 990 Pro 2TB NVMe SSD', quantity: 1, unitPrice: 75000, total: 75000, warrantyDueDate: new Date('2031-01-06') },
                { productId: '13', productName: 'NZXT Kraken X73 RGB', quantity: 1, unitPrice: 75000, total: 75000, warrantyDueDate: new Date('2032-01-06') },
            ],
            payments: [
                { amount: 50000, paymentMethod: client_1.PaymentMethod.CASH, paymentDate: new Date('2026-01-06T09:00:00'), notes: 'Down payment at purchase' },
                { amount: 50000, paymentMethod: client_1.PaymentMethod.BANK_TRANSFER, paymentDate: new Date('2026-01-13T15:30:00'), notes: 'Bank transfer installment' },
            ],
        },
        {
            id: '10260007',
            invoiceNumber: 'INV-10260007',
            customerId: '1',
            customerName: 'Kasun Perera',
            subtotal: 95000,
            tax: 14250,
            total: 109250,
            paidAmount: 109250,
            dueAmount: 0,
            status: client_1.InvoiceStatus.FULLPAID,
            date: new Date('2026-01-11'),
            dueDate: new Date('2026-01-26'),
            paymentMethod: client_1.PaymentMethod.CARD,
            salesChannel: client_1.SalesChannel.ON_SITE,
            items: [
                { productId: '19', productName: 'SteelSeries Arctis Nova Pro', quantity: 1, unitPrice: 95000, total: 95000, warrantyDueDate: new Date('2027-01-11') },
            ],
        },
        {
            id: '10260008',
            invoiceNumber: 'INV-10260008',
            customerId: '8',
            customerName: 'Sanjay Mendis',
            subtotal: 434000,
            tax: 65100,
            total: 499100,
            paidAmount: 499100,
            dueAmount: 0,
            status: client_1.InvoiceStatus.FULLPAID,
            date: new Date('2026-01-12'),
            dueDate: new Date('2026-01-27'),
            paymentMethod: client_1.PaymentMethod.BANK_TRANSFER,
            salesChannel: client_1.SalesChannel.ONLINE,
            items: [
                { productId: '5', productName: 'AMD Radeon RX 7900 XTX', quantity: 1, unitPrice: 350000, total: 350000, warrantyDueDate: new Date('2028-01-12') },
                { productId: '7', productName: 'WD Black SN850X 1TB', quantity: 2, unitPrice: 42000, total: 84000, warrantyDueDate: new Date('2031-01-12') },
            ],
        },
        {
            id: '10260009',
            invoiceNumber: 'INV-10260009',
            customerId: '6',
            customerName: 'Priya Jayawardena',
            subtotal: 153000,
            tax: 22950,
            total: 175950,
            paidAmount: 175950,
            dueAmount: 0,
            status: client_1.InvoiceStatus.FULLPAID,
            date: new Date('2026-01-14'),
            dueDate: new Date('2026-01-29'),
            paymentMethod: client_1.PaymentMethod.CASH,
            salesChannel: client_1.SalesChannel.ON_SITE,
            items: [
                { productId: '14', productName: 'Lian Li O11 Dynamic EVO', quantity: 1, unitPrice: 58000, total: 58000, warrantyDueDate: new Date('2028-01-14') },
                { productId: '9', productName: 'G.Skill Trident Z5 64GB DDR5', quantity: 1, unitPrice: 95000, total: 95000 },
            ],
        },
        {
            id: '10260010',
            invoiceNumber: 'INV-10260010',
            customerId: '3',
            customerName: 'Tech Solutions Ltd',
            subtotal: 1120000,
            tax: 168000,
            total: 1288000,
            paidAmount: 800000,
            dueAmount: 488000,
            status: client_1.InvoiceStatus.HALFPAY,
            date: new Date('2026-01-15'),
            dueDate: new Date('2026-01-30'),
            paymentMethod: client_1.PaymentMethod.CREDIT,
            salesChannel: client_1.SalesChannel.ON_SITE,
            items: [
                { productId: '11', productName: 'MSI MEG Z790 ACE', quantity: 3, unitPrice: 165000, total: 495000, warrantyDueDate: new Date('2029-01-15') },
                { productId: '20', productName: 'Seagate Exos 18TB HDD', quantity: 5, unitPrice: 125000, total: 625000, warrantyDueDate: new Date('2031-01-15') },
            ],
        },
        {
            id: '10260011',
            invoiceNumber: 'INV-10260011',
            customerId: '5',
            customerName: 'GameZone Café',
            subtotal: 1170000,
            tax: 175500,
            total: 1345500,
            paidAmount: 1345500,
            dueAmount: 0,
            status: client_1.InvoiceStatus.FULLPAID,
            date: new Date('2026-01-17'),
            dueDate: new Date('2026-02-01'),
            paymentMethod: client_1.PaymentMethod.BANK_TRANSFER,
            salesChannel: client_1.SalesChannel.ONLINE,
            items: [
                { productId: '17', productName: 'Logitech G Pro X Superlight 2', quantity: 10, unitPrice: 52000, originalPrice: 55000, total: 520000, warrantyDueDate: new Date('2028-01-17') },
                { productId: '18', productName: 'Razer Huntsman V3 Pro', quantity: 10, unitPrice: 65000, originalPrice: 68000, total: 650000, warrantyDueDate: new Date('2028-01-17') },
            ],
        },
        {
            id: '10260012',
            invoiceNumber: 'INV-10260012',
            customerId: '2',
            customerName: 'Nimali Fernando',
            subtotal: 90000,
            tax: 13500,
            total: 103500,
            paidAmount: 0,
            dueAmount: 103500,
            status: client_1.InvoiceStatus.UNPAID,
            date: new Date('2026-01-19'),
            dueDate: new Date('2026-02-03'),
            paymentMethod: client_1.PaymentMethod.CREDIT,
            salesChannel: client_1.SalesChannel.ON_SITE,
            items: [
                { productId: '8', productName: 'Corsair Vengeance DDR5 32GB', quantity: 2, unitPrice: 45000, originalPrice: 48000, total: 90000 },
            ],
        },
    ];
    for (const inv of invoiceData) {
        const { items, payments, ...invoiceFields } = inv;
        // Create invoice
        const invoice = await prisma.invoice.upsert({
            where: { id: inv.id },
            update: {},
            create: invoiceFields,
        });
        // Create invoice items
        for (const item of items) {
            await prisma.invoiceItem.create({
                data: {
                    invoiceId: invoice.id,
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    originalPrice: item.originalPrice,
                    total: item.total,
                    warrantyDueDate: item.warrantyDueDate,
                },
            });
        }
        // Create payments if any
        if (payments) {
            for (const payment of payments) {
                await prisma.invoicePayment.create({
                    data: {
                        invoiceId: invoice.id,
                        amount: payment.amount,
                        paymentMethod: payment.paymentMethod,
                        paymentDate: payment.paymentDate,
                        notes: payment.notes,
                    },
                });
            }
        }
    }
    console.log(`✅ Created ${invoiceData.length} invoices with items and payments`);
    console.log('');
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Categories: ${Object.keys(categories).length}`);
    console.log(`   - Brands: ${Object.keys(brands).length}`);
    console.log(`   - Customers: ${customerData.length}`);
    console.log(`   - Products: ${productData.length}`);
    console.log(`   - Invoices: ${invoiceData.length}`);
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map