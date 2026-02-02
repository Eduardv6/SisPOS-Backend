# Instrucciones para Aplicar la Migración

## El backend ya está actualizado con los cambios necesarios.

### Ejecuta este comando en PowerShell:

```powershell
cd "C:\Users\Eduardo Villarroel\Desktop\Clone SisPOS\SisPOS-Backend"
npx prisma migrate dev --name replace_email_with_nro_documento
```

### Luego reinicia el servidor backend:

1. Presiona `Ctrl+C` para detener el servidor actual
2. Ejecuta: `npm run dev`

### Prueba:

1. Ve a Clientes en tu aplicación
2. Crea un nuevo cliente con número de documento
3. Verifica que se guarde correctamente

---

## Archivos ya modificados:

- ✅ `prisma/schema.prisma` - Modelo Cliente actualizado
- ✅ `src/controllers/clienteController.js` - Controlador actualizado
- ✅ Frontend - Formulario de clientes actualizado

El número de documento se guardará correctamente después de ejecutar la migración.
