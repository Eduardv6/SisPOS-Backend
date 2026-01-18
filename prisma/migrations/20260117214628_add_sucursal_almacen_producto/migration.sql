/*
  Warnings:

  - You are about to drop the column `controlar_stock` on the `productos` table. All the data in the column will be lost.
  - You are about to drop the column `ubicacion_general` on the `productos` table. All the data in the column will be lost.
  - Added the required column `almacen_id` to the `productos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sucursal_id` to the `productos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `productos` DROP COLUMN `controlar_stock`,
    DROP COLUMN `ubicacion_general`,
    ADD COLUMN `almacen_id` INTEGER NOT NULL,
    ADD COLUMN `sucursal_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_almacen_id_fkey` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
