-- AlterTable
ALTER TABLE `detalle_ventas` ADD COLUMN `precio_compra` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `ventas` ADD COLUMN `metodo_pago` VARCHAR(50) NOT NULL DEFAULT 'efectivo';
