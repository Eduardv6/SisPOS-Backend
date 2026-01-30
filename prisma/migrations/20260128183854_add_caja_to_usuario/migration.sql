-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `caja_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_caja_id_fkey` FOREIGN KEY (`caja_id`) REFERENCES `cajas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
