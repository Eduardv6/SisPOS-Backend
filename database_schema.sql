-- Database Script for Tienda Multicaja Application
-- Generated based on analysis of frontend React components and requirements.

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema tienda_multicaja
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `tienda_multicaja` DEFAULT CHARACTER SET utf8mb4 ;
USE `tienda_multicaja` ;

-- -----------------------------------------------------
-- Table `sucursales`
-- Derived from: src/pages/admin/Sucursales.jsx
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sucursales` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `direccion` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `cajas`
-- Derived from: src/pages/admin/Sucursales.jsx, src/pages/admin/AperturaCajas.jsx
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `cajas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `sucursal_id` INT NOT NULL,
  `estado` ENUM('LIBRE', 'OCUPADA', 'CERRADA') DEFAULT 'CERRADA',
  `codigo` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_cajas_sucursales_idx` (`sucursal_id` ASC),
  CONSTRAINT `fk_cajas_sucursales`
    FOREIGN KEY (`sucursal_id`)
    REFERENCES `sucursales` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `usuarios`
-- Derived from: src/pages/admin/Usuarios.jsx
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombres` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `contrasena` VARCHAR(255) NOT NULL,
  `nro_doc` VARCHAR(20) NULL,
  `telefono` VARCHAR(20) NULL,
  `tipo` ENUM('cajero', 'vendedor', 'supervisor', 'administrador') NOT NULL DEFAULT 'cajero',
  `estado` TINYINT(1) DEFAULT 1,
  `sucursal_id` INT NULL COMMENT 'Sucursal asignada por defecto',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_unique` (`email` ASC),
  INDEX `fk_usuarios_sucursales_idx` (`sucursal_id` ASC),
  CONSTRAINT `fk_usuarios_sucursales`
    FOREIGN KEY (`sucursal_id`)
    REFERENCES `sucursales` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `user_permissions` (Optional, based on 'permisos' array in Usuarios.jsx)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `permisos_usuarios` (
    `usuario_id` INT NOT NULL,
    `permiso` VARCHAR(50) NOT NULL,
    PRIMARY KEY (`usuario_id`, `permiso`),
    CONSTRAINT `fk_permisos_usuario`
        FOREIGN KEY (`usuario_id`)
        REFERENCES `usuarios` (`id`)
        ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table `categorias`
-- Derived from: src/pages/admin/Categorias.jsx
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `categorias` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL,
  `icono` VARCHAR(50) NULL,
  `activa` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `productos`
-- Derived from: src/pages/admin/Productos.jsx, AddProducto.jsx
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `productos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(150) NOT NULL,
  `categoria_id` INT NOT NULL,
  `precio_compra` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `precio_venta` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `codigo_barras` VARCHAR(100) NULL,
  `codigo_interno` VARCHAR(100) NULL,
  `unidad_medida` VARCHAR(50) DEFAULT 'Unidad',
  `controlar_stock` TINYINT(1) DEFAULT 1,
  `stock_minimo` INT DEFAULT 0,
  `ubicacion_general` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `codigo_barras_unique` (`codigo_barras` ASC),
  INDEX `fk_productos_categorias_idx` (`categoria_id` ASC),
  CONSTRAINT `fk_productos_categorias`
    FOREIGN KEY (`categoria_id`)
    REFERENCES `categorias` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `almacenes`
-- Derived from: src/pages/admin/Almacenes.jsx (implied from stock logic)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `almacenes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `sucursal_id` INT NOT NULL,
  `ubicacion` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_almacenes_sucursales_idx` (`sucursal_id` ASC),
  CONSTRAINT `fk_almacenes_sucursales`
    FOREIGN KEY (`sucursal_id`)
    REFERENCES `sucursales` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `inventario` (Stock per warehouse)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventario` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `producto_id` INT NOT NULL,
  `almacen_id` INT NOT NULL,
  `cantidad` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `ubicacion_fisica` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `unique_stock` (`producto_id` ASC, `almacen_id` ASC),
  INDEX `fk_inventario_almacen_idx` (`almacen_id` ASC),
  CONSTRAINT `fk_inventario_producto`
    FOREIGN KEY (`producto_id`)
    REFERENCES `productos` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_inventario_almacen`
    FOREIGN KEY (`almacen_id`)
    REFERENCES `almacenes` (`id`)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `clientes`
-- Derived from: src/pages/admin/Clientes.jsx
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clientes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(150) NOT NULL,
  `email` VARCHAR(100) NULL,
  `direccion` TEXT NULL,
  `celular` VARCHAR(20) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `proveedores`
-- Derived from: src/pages/admin/Proveedores.jsx
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `proveedores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(150) NOT NULL,
  `direccion` TEXT NULL,
  `celular` VARCHAR(20) NULL,
  `contacto` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `sesiones_caja` (Cash Drawer Sessions/Shifts)
-- To track Apertura and Cierre data
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sesiones_caja` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `caja_id` INT NOT NULL,
  `usuario_id` INT NOT NULL,
  `fecha_inicio` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_fin` DATETIME NULL,
  `monto_inicial` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `monto_final` DECIMAL(10,2) NULL,
  `estado` ENUM('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',
  PRIMARY KEY (`id`),
  INDEX `fk_sesiones_caja_idx` (`caja_id` ASC),
  INDEX `fk_sesiones_usuario_idx` (`usuario_id` ASC),
  CONSTRAINT `fk_sesiones_caja`
    FOREIGN KEY (`caja_id`)
    REFERENCES `cajas` (`id`),
  CONSTRAINT `fk_sesiones_usuario`
    FOREIGN KEY (`usuario_id`)
    REFERENCES `usuarios` (`id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `ventas`
-- Derived from: src/pages/admin/PuntoVenta.jsx
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ventas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cliente_id` INT NULL,  -- Nullable for anonymous clients
  `usuario_id` INT NOT NULL,
  `sucursal_id` INT NOT NULL,
  `caja_id` INT NOT NULL,
  `sesion_caja_id` INT NOT NULL, -- Link to specific cash session
  `tipo_documento` ENUM('factura', 'boleta', 'ticket') NOT NULL DEFAULT 'ticket',
  `numero_documento` VARCHAR(50) NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `estado` ENUM('completada', 'anulada') NOT NULL DEFAULT 'completada',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_ventas_cliente_idx` (`cliente_id` ASC),
  INDEX `fk_ventas_usuario_idx` (`usuario_id` ASC),
  CONSTRAINT `fk_ventas_cliente`
    FOREIGN KEY (`cliente_id`)
    REFERENCES `clientes` (`id`),
  CONSTRAINT `fk_ventas_usuario`
    FOREIGN KEY (`usuario_id`)
    REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_ventas_sesion`
    FOREIGN KEY (`sesion_caja_id`)
    REFERENCES `sesiones_caja` (`id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `detalle_ventas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `detalle_ventas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `venta_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `cantidad` INT NOT NULL,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_detalle_venta_idx` (`venta_id` ASC),
  INDEX `fk_detalle_producto_idx` (`producto_id` ASC),
  CONSTRAINT `fk_detalle_venta`
    FOREIGN KEY (`venta_id`)
    REFERENCES `ventas` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_detalle_producto`
    FOREIGN KEY (`producto_id`)
    REFERENCES `productos` (`id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `movimientos_caja`
-- Derived from: Ingreso/Retiro Modal in PuntoVenta.jsx
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `movimientos_caja` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sesion_caja_id` INT NOT NULL,
  `usuario_id` INT NOT NULL,
  `tipo` ENUM('INGRESO', 'RETIRO') NOT NULL,
  `monto` DECIMAL(10,2) NOT NULL,
  `motivo` TEXT NULL,
  `fecha` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_movimientos_sesion`
    FOREIGN KEY (`sesion_caja_id`)
    REFERENCES `sesiones_caja` (`id`),
  CONSTRAINT `fk_movimientos_usuario`
    FOREIGN KEY (`usuario_id`)
    REFERENCES `usuarios` (`id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `compras` (Optional, implied by Suppliers/Products)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `compras` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `proveedor_id` INT NOT NULL,
  `usuario_id` INT NOT NULL,
  `sucursal_id` INT NOT NULL,
  `fecha` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `total` DECIMAL(10,2) NOT NULL,
  `numero_comprobante` VARCHAR(50) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_compras_proveedor`
    FOREIGN KEY (`proveedor_id`)
    REFERENCES `proveedores` (`id`),
  CONSTRAINT `fk_compras_usuario`
    FOREIGN KEY (`usuario_id`)
    REFERENCES `usuarios` (`id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table `detalle_compras`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `detalle_compras` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `compra_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `cantidad` INT NOT NULL,
  `precio_compra` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_detalle_compra`
    FOREIGN KEY (`compra_id`)
    REFERENCES `compras` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_detalle_compra_prod`
    FOREIGN KEY (`producto_id`)
    REFERENCES `productos` (`id`)
) ENGINE = InnoDB;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
