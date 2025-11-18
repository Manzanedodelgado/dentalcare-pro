# CONFIGURACIÓN FIREWALL PARA RENDER.COM

## OPCIÓN 1: Script Automático (RECOMENDADO)

1. **Ejecutar como Administrador:**
   - Clic derecho en `configurar-firewall-render.bat`
   - Seleccionar "Ejecutar como administrador"

2. **El script configurará automáticamente:**
   - ✅ Permitir acceso desde 44.229.227.142 al puerto 1433
   - ✅ Permitir acceso desde 54.188.71.94 al puerto 1433  
   - ✅ Permitir acceso desde 52.13.128.108 al puerto 1433
   - ✅ Permitir acceso desde 74.220.48.0/24 al puerto 1433
   - ✅ Permitir acceso desde 74.220.56.0/24 al puerto 1433

## OPCIÓN 2: Configuración Manual (Si falla el script)

### Paso 1: Abrir Firewall de Windows
- Abrir "Panel de Control" → "Sistema y seguridad" → "Firewall de Windows Defender"
- Clic en "Configuración avanzada"

### Paso 2: Crear Reglas de Entrada
Para cada IP/red, crear una regla de entrada:

**Para IP: 44.229.227.142**
- Clic derecho en "Reglas de entrada" → "Nueva regla"
- Tipo: Puerto → TCP → Puerto local específico: 1433
- Acción: Permitir la conexión
- Perfil: Todos
- Nombre: RenderSQL_44_229_227_142

**Repetir para:**
- 54.188.71.94 → RenderSQL_54_188_71_94
- 52.13.128.108 → RenderSQL_52_13_128_108
- 74.220.48.0/24 → RenderSQL_74_220_48_0_24
- 74.220.56.0/24 → RenderSQL_74_220_56_0_24

### Paso 3: Verificar Configuración
Ejecutar en CMD (como administrador):
```cmd
netsh advfirewall firewall show rule name=RenderSQL*
```

## NOTAS IMPORTANTES

1. **Ejecutar como Administrador:** Es obligatorio para modificar el firewall
2. **SQL Server configurado:** Asegúrate de que SQL Server esté configurado para aceptar conexiones remotas
3. **Puerto 1433:** El firewall debe permitir el puerto 1433 (SQL Server)
4. **Windows Authentication:** Ya está configurado para GABINETE2\BOX2

## SOLUCIÓN DE PROBLEMAS

**Si el script falla:**
- Ejecutar CMD como Administrador
- Ejecutar cada comando manualmente:
  ```cmd
  netsh advfirewall firewall add rule name="RenderSQL_44_229_227_142" dir=in action=allow protocol=TCP localport=1433 remoteip=44.229.227.142
  netsh advfirewall firewall add rule name="RenderSQL_54_188_71_94" dir=in action=allow protocol=TCP localport=1433 remoteip=54.188.71.94
  netsh advfirewall firewall add rule name="RenderSQL_52_13_128_108" dir=in action=allow protocol=TCP localport=1433 remoteip=52.13.128.108
  netsh advfirewall firewall add rule name="RenderSQL_74_220_48_0_24" dir=in action=allow protocol=TCP localport=1433 remoteip=74.220.48.0/24
  netsh advfirewall firewall add rule name="RenderSQL_74_220_56_0_24" dir=in action=allow protocol=TCP localport=1433 remoteip=74.220.56.0/24
  ```

**Para eliminar reglas (si es necesario):**
```cmd
netsh advfirewall firewall delete rule name="RenderSQL*"
```