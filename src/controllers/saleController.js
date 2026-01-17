import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const createSale = async (req, res) => {
  const { 
    items,          // Array: [{ variantId: 1, quantity: 2, price: 50 }, ...]
    payments,       // Array: [{ method: 'CASH', amount: 100 }] (Para soportar pagos mixtos)
    customerId,     // Opcional
    cashRegisterId, // ID de la caja
    totalAmount     // Total calculado en frontend (lo validaremos igual)
  } = req.body;

  const userId = req.user.id; 

  if (!items || items.length === 0 || !payments) {
    return res.status(400).json({ error: 'La venta debe tener items y método de pago' });
  }

  try {

    const result = await prisma.$transaction(async (tx) => {

      for (const item of items) {

        const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId }
        });

        if (!variant) {
            throw new Error(`Producto con ID ${item.variantId} no encontrado`);
        }

        if (variant.stockQuantity < item.quantity) {
            throw new Error(`Stock insuficiente para el producto: ${variant.sku}. Disponibles: ${variant.stockQuantity}`);
        }
      }

      const invoiceNumber = `INV-${Date.now()}`; 

      const newSale = await tx.sale.create({
        data: {
            invoiceNumber,
            totalAmount: parseFloat(totalAmount),
            status: 'COMPLETED',
            userId: userId,           // El cajero logueado
            cashRegisterId: parseInt(cashRegisterId),
            customerId: customerId ? parseInt(customerId) : null,
        }
      });

      for (const item of items) {

        await tx.saleDetail.create({
            data: {
                saleId: newSale.id,
                productVariantId: item.variantId,
                quantity: item.quantity,
                unitPrice: parseFloat(item.price), // Precio al momento de vender
                subtotal: item.quantity * parseFloat(item.price)
            }
        });

        await tx.productVariant.update({
            where: { id: item.variantId },
            data: { 
                stockQuantity: { decrement: item.quantity }
            }
        });


        await tx.inventoryTransaction.create({
            data: {
                productVariantId: item.variantId,
                type: 'SALE',
                quantity: -item.quantity,
                reference: `VENTA #${newSale.id}`,
                description: `Salida por venta de mostrador`
            }
        });
      }
      for (const payment of payments) {
        await tx.payment.create({
            data: {
                saleId: newSale.id,
                method: payment.method,
                amount: parseFloat(payment.amount)
            }
        });
      }

      return newSale;
    });
    res.status(201).json({ 
        message: 'Venta registrada con éxito', 
        saleId: result.id,
        invoice: result.invoiceNumber
    });

  } catch (error) {
    console.error('Error en la transacción de venta:', error.message);
    res.status(400).json({ error: error.message || 'Error al procesar la venta' });
  }
};

export {createSale};