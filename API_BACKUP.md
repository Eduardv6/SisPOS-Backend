# API de Backup - SisPOS Backend

Documentación de los endpoints para exportar datos de la base de datos.

> ⚠️ **Todos los endpoints requieren autenticación y rol de Administrador**

---

## Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/backup/stats` | Estadísticas del backup |
| `GET` | `/api/backup/excel` | Exportar TODA la BD a Excel |
| `GET` | `/api/backup/excel/:tabla` | Exportar tabla específica |

---

## 1. Obtener Estadísticas

Ver cuántos registros hay en cada tabla antes de descargar.

### Request
```http
GET /api/backup/stats
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "message": "Estadísticas del backup",
  "tablas": {
    "sucursales": 2,
    "cajas": 4,
    "usuarios": 5,
    "categorias": 8,
    "productos": 150,
    "clientes": 45,
    "proveedores": 12,
    "ventas": 320,
    "inventarios": 150
  },
  "totalRegistros": 696
}
```

---

## 2. Exportar Todo a Excel

Descarga un archivo `.xlsx` con todas las tablas de la base de datos.

### Request
```http
GET /api/backup/excel
Authorization: Bearer <token>
```

### Response
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Nombre archivo:** `backup_sispos_2026-02-06.xlsx`

### Hojas incluidas en el Excel:
1. Sucursales
2. Cajas
3. Usuarios (sin contraseñas)
4. Categorías
5. Almacenes
6. Productos
7. Clientes
8. Proveedores
9. Ventas
10. Detalle Ventas
11. Inventario
12. Sesiones Caja

---

## 3. Exportar Tabla Específica

Descarga un archivo `.xlsx` con solo una tabla.

### Request
```http
GET /api/backup/excel/:tabla
Authorization: Bearer <token>
```

### Parámetros de URL

| Parámetro | Tipo | Valores permitidos |
|-----------|------|-------------------|
| `tabla` | string | `productos`, `ventas`, `clientes`, `inventario`, `usuarios`, `proveedores` |

### Ejemplos
```http
GET /api/backup/excel/productos
GET /api/backup/excel/ventas
GET /api/backup/excel/clientes
```

### Response
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Nombre archivo:** `productos_2026-02-06.xlsx`

### Response Error (400)
```json
{
  "error": "Tabla no permitida. Tablas disponibles: productos, ventas, clientes, inventario, usuarios, proveedores"
}
```

---

## Implementación en Frontend

### Opción 1: Abrir en nueva pestaña (simple)
```javascript
const descargarBackupCompleto = () => {
  // Nota: Esto solo funciona si el token está en cookies
  window.open(`${API_URL}/api/backup/excel`, '_blank');
};
```

### Opción 2: Fetch con token (recomendado)
```javascript
const descargarBackup = async (tabla = null) => {
  const url = tabla 
    ? `${API_URL}/api/backup/excel/${tabla}` 
    : `${API_URL}/api/backup/excel`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error descargando archivo');
    }

    // Obtener el nombre del archivo del header
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1].replace(/"/g, '')
      : 'backup.xlsx';

    // Crear blob y descargar
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error:', error);
    alert('Error descargando el backup');
  }
};
```

### Uso en componentes
```javascript
// Botón para backup completo
<button onClick={() => descargarBackup()}>
  Descargar Backup Completo
</button>

// Botón para tabla específica
<button onClick={() => descargarBackup('productos')}>
  Exportar Productos
</button>

// Botón para ver estadísticas primero
const verEstadisticas = async () => {
  const response = await fetch(`${API_URL}/api/backup/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  console.log('Registros a exportar:', data.totalRegistros);
};
```

---

## Ejemplo de Componente React

```jsx
import { useState } from 'react';

const BackupPanel = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const cargarEstadisticas = async () => {
    const res = await fetch(`${API_URL}/api/backup/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setStats(await res.json());
  };

  const descargar = async (tabla) => {
    setLoading(true);
    await descargarBackup(tabla);
    setLoading(false);
  };

  return (
    <div>
      <h2>Backup de Datos</h2>
      
      <button onClick={cargarEstadisticas}>Ver Estadísticas</button>
      
      {stats && (
        <div>
          <p>Total registros: {stats.totalRegistros}</p>
          <ul>
            {Object.entries(stats.tablas).map(([tabla, count]) => (
              <li key={tabla}>{tabla}: {count}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <button onClick={() => descargar()} disabled={loading}>
          {loading ? 'Descargando...' : 'Backup Completo (.xlsx)'}
        </button>
      </div>

      <div>
        <h3>Exportar por tabla:</h3>
        {['productos', 'ventas', 'clientes', 'inventario'].map(tabla => (
          <button key={tabla} onClick={() => descargar(tabla)}>
            {tabla}
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

## Errores Comunes

| Código | Mensaje | Causa |
|--------|---------|-------|
| 401 | `Token no proporcionado` | Falta header Authorization |
| 403 | `Acceso denegado` | Usuario no es administrador |
| 400 | `Tabla no permitida` | Nombre de tabla inválido |
| 500 | `Error generando archivo Excel` | Error interno del servidor |
