// Script para sincronizar el campo stock de productos con la suma de inventarios
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function syncProductStock() {
    console.log("🔄 Sincronizando stock de productos con inventarios...\n");

    try {
        // Obtener todos los productos
        const productos = await prisma.producto.findMany({
            include: { inventarios: true }
        });

        console.log(`📦 Encontrados ${productos.length} productos\n`);

        for (const producto of productos) {
            // Calcular el stock total desde inventarios
            const stockTotal = producto.inventarios.reduce((sum, inv) => {
                return sum + parseFloat(inv.cantidad);
            }, 0);

            // Actualizar el campo stock del producto
            await prisma.producto.update({
                where: { id: producto.id },
                data: { stock: stockTotal }
            });

            console.log(`✅ ${producto.nombre}:`);
            console.log(`   Stock anterior: ${producto.stock}`);
            console.log(`   Stock calculado: ${stockTotal}`);
            producto.inventarios.forEach(inv => {
                console.log(`   - Almacén ${inv.almacenId}: ${inv.cantidad} unidades`);
            });
            console.log("");
        }

        console.log("✅ Sincronización completada exitosamente!");
    } catch (error) {
        console.error("❌ Error sincronizando stock:", error);
    } finally {
        await prisma.$disconnect();
    }
}

syncProductStock();
