import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Script de Migración: Recalcular Stocks
 * 
 * Este script recalcula el campo 'stock' de la tabla Producto
 * basándose en la suma real de la tabla Inventario.
 * 
 * Uso: node scripts/recalcularStocks.js
 */

async function recalcularStocks() {
    console.log('🔄 Iniciando recalculación de stocks...\n');

    try {
        // 1. Obtener todos los productos con sus inventarios
        const productos = await prisma.producto.findMany({
            include: {
                inventarios: true
            }
        });

        console.log(`📦 Productos encontrados: ${productos.length}\n`);

        let actualizados = 0;
        let sinCambios = 0;
        const diferencias = [];

        // 2. Recalcular stock para cada producto
        for (const producto of productos) {
            // Calcular stock real desde inventarios
            const stockCalculado = producto.inventarios.reduce((sum, inv) => {
                return sum + parseFloat(inv.cantidad);
            }, 0);

            const stockActual = parseInt(producto.stock) || 0;
            const diferencia = stockActual - stockCalculado;

            // Si hay diferencia, actualizar
            if (diferencia !== 0) {
                await prisma.producto.update({
                    where: { id: producto.id },
                    data: { stock: stockCalculado }
                });

                diferencias.push({
                    id: producto.id,
                    nombre: producto.nombre,
                    stockAnterior: stockActual,
                    stockNuevo: stockCalculado,
                    diferencia: diferencia
                });

                actualizados++;
            } else {
                sinCambios++;
            }
        }

        // 3. Mostrar resultados
        console.log('\n✅ Recalculación completada!\n');
        console.log(`📊 Resumen:`);
        console.log(`   - Productos actualizados: ${actualizados}`);
        console.log(`   - Productos sin cambios: ${sinCambios}`);

        if (diferencias.length > 0) {
            console.log('\n📋 Diferencias encontradas:\n');
            console.table(diferencias.map(d => ({
                ID: d.id,
                Producto: d.nombre.substring(0, 40),
                'Stock Anterior': d.stockAnterior,
                'Stock Nuevo': d.stockNuevo,
                Diferencia: d.diferencia
            })));
        } else {
            console.log('\n✨ No se encontraron inconsistencias.');
        }

    } catch (error) {
        console.error('❌ Error durante la recalculación:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar
recalcularStocks()
    .then(() => {
        console.log('\n✅ Script finalizado exitosamente.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });
