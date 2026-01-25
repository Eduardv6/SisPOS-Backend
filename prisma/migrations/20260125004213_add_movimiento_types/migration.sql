-- AlterTable
ALTER TABLE `movimientos_caja` MODIFY `tipo` ENUM('INGRESO', 'RETIRO', 'VENTA', 'APERTURA', 'CIERRE') NOT NULL;
