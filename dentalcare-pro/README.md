# DentalCare Pro - Sistema Inteligente de Gestión Dental

## 📋 Descripción del Proyecto

Sistema web completo de gestión para **Clínica Rubio García Dental**, diseñado para unificar la agenda de pacientes y la comunicación mediante WhatsApp. El sistema incluye un agente IA avanzado para automatización de comunicaciones, gestión de documentos, facturación conforme a Verifactu y control contable completo. Este es un sistema de **máxima complejidad** con funcionalidades avanzadas de automatización legal y cumplimiento normativo.

**Repositorio**: [dentalcare-pro](https://github.com/Manzanedodelgado/dentalcare-pro)

## 🏥 Información de la Clínica

- **Nombre**: Clínica Dental Rubio García
- **Administrador**: Juan Antonio Manzanedo
- **Email**: info@rubiogarciadental.com
- **Usuario Admin**: JMD
- **Contraseña Admin**: 190582
- **WhatsApp**: 34664218253

## ✨ Características Principales

### 🎯 Gestión de Citas
- **Sistema de confirmación obligatorio**: Los pacientes deben confirmar su cita antes de aparecer en la agenda
- **Horarios específicos por doctor**:
  - **Lunes**: Dra. Virginia Tresgallo (Ortodoncista, Higienes, Primeras visitas maloclusiones)
  - **Martes**: Dra. Irene García (Endodoncista, General, Higienes, Periodoncia, Dolores, Primeras visitas)
  - **Miércoles**: Dr. Mario Rubio (Implantología, Cirugía, Primeras ausencias dentales)
  - **Jueves**: Tc. Juan Antonio Manzanedo (Higienes, Blanqueamiento, Pruebas, Registros)
  - **Viernes**: Juan Antonio (Administrativo, Presupuestos, Financiaciones)
- **Estados de cita**:
  - **Planificada**: Borrador inicial
  - **Confirmada**: Pendiente de aceptación de consentimiento
  - **Aceptada**: Confirmación completa
  - **Anulada**: Cancelada por paciente o clínica
- **Integración con SQL Server**: Sincronización con tabla `dbo.DCitas`
- **Control de acceso seguro**: Solo citas confirmadas aparecen en la agenda del día

### 👥 Gestión de Pacientes
- Base de datos completa de pacientes
- Datos de contacto actualizados
- Historial de tratamientos
- Gestión de consentimientos informados
- Cuestionarios de primera cita

### 💬 Sistema de WhatsApp
- **Sin API Business de WhatsApp**: Implementación con Baileys
- Diseño similar a WhatsApp Web
- Envío de mensajes automatizados
- Recepción de mensajes de pacientes
- Plantillas de mensajes personalizables
- Recordatorios automáticos de citas

### 🚨 Sistema de Urgencias WhatsApp
- **Panel de control de urgencias**:
  - Vista especializada para conversaciones urgentes
  - Filtro automático: Solo conversaciones naranjas
  - Escalamiento automático de casos críticos
  - Notificaciones en tiempo real para urgencias
- **Codificación inteligente**:
  - **Detección automática**: Palabras clave de urgencia
  - **Análisis de contexto**: Identificación de emergencias
  - **Etiquetado manual**: Posibilidad de marcar urgencias
  - **Priorización**: Orden por nivel de urgencia
- **Respuestas automáticas**:
  - Mensajes de confirmación de urgencia
  - Derivación automática a personal adecuado
  - Recordatorios de seguimiento urgente
  - Escalamiento según protocolo establecido

### 🔐 Control de Acceso Completo
- **Gestión de usuarios multi-nivel**:
  - Administradores: Acceso total al sistema
  - Dentistas: Gestión de pacientes y citas
  - Personal administrativo: Agenda y comunicaciones
  - Higienistas: Accesos específicos (Juan Antonio Manzanedo)
- **Sistema de permisos granular**:
  - Control de acceso por módulos
  - Permisos específicos por acción
  - Auditoría de accesos
  - Sesiones seguras con JWT
- **Configuración avanzada**:
  - Creación y edición de usuarios
  - Gestión de roles y permisos
  - Configuración de accesos por departamento
  - Logs de seguridad completos

### 🏠 Panel de Control Principal
- **Dashboard en tiempo real**:
  - **Citas del día en curso**: Listado completo con estados actuales
  - **Mensajes urgentes codificados en naranja**: Conversaciones que requieren atención inmediata
  - **Estadísticas de actividad**: Métricas en tiempo real del día
- **Funciones rápidas de acceso directo**:
  - **Nueva Cita**: Creación instantánea de citas
  - **Nuevo Contacto**: Agregar pacientes rápidamente
  - **Nueva Factura**: Generación inmediata de facturas
- **Alertas inteligentes**:
  - Notificaciones de citas pendientes de confirmación
  - Mensajes marcados como urgentes (naranja)
  - Recordatorios de seguimientos

### 🟠 Sistema de Codificación por Colores WhatsApp
- **Codificación naranja para urgencias**:
  - Conversaciones marcadas automáticamente en naranja para casos urgentes
  - Identificación manual de conversaciones que requieren atención inmediata
  - Filtros para mostrar solo conversaciones urgentes
  - Escalamiento automático de conversaciones críticas
- **Estados de urgencia**:
  - **Verde**: Conversaciones normales
  - **Amarillo**: Atención moderada requerida
  - **Naranja**: Urgente - requiere intervención inmediata
  - **Rojo**: Crítico - atención prioritaria
- **Automatización inteligente**:
  - Detección automática de palabras clave urgentes
  - Análisis de contexto para identificar emergencias
  - Etiquetado automático de conversaciones críticas

### 🤖 Agente IA Avanzado
- **Automatización de mensajes**:
  - Recordatorios diarios de citas consultando dbo.DCitas
  - Envío de consentimientos informados
  - Cuestionarios de primeras citas con LOPD
  - Mensajes de seguimiento post-tratamiento
  - Automatizaciones de confirmación de citas
- **Configuración personalizable**: Definición de comportamiento del agente
- **Intervención inteligente**: Identificación de mensajes que requieren atención urgente
- **Flujos dinámicos**: Automatizaciones complejas con documentos legales y cuestionarios

### 📅 Agenda Avanzada de Citaciones
- **Sincronización completa con SQL Server**:
  - Integración directa con tabla `dbo.DCitas`
  - Actualización en tiempo real de citas
  - Bidireccionalidad de datos
  - Respeto total de la estructura SQL original
- **Funcionalidades completas de agenda**:
  - **Vista diaria, semanal y mensual** de citas
  - **Gestión de horarios**: Franjas personalizables
  - **Citas recurrentes**: Programación automática
  - **Reservas online**: Sistema de citas web
  - **Lista de espera**: Gestión automática de cancelaciones
- **Estados de citas editables**:
  - **Planificada** 🟡: Borrador inicial, pendiente de confirmación
  - **Confirmada** 🔵: Confirmada, pendiente de consentimiento LOPD
  - **Aceptada** 🟢: Confirmada + documentos LOPD + cuestionario completo
  - **Anulada** 🔴: Cancelada por paciente o clínica
- **Relación directa con automatizaciones**:
  - Confirmaciones automáticas por WhatsApp
  - Recordatorios vinculados a estados de cita
  - Consentimientos informados condicionados al estado
  - Escalamiento por estados no confirmados

### 📄 Gestión Documental Avanzada
- Creación de documentos automatizados
- Cuestionarios personalizables con validación LOPD
- Plantillas de consentimientos informados
- Sistema de envío programado con seguimiento
- Historial completo de documentos enviados
- **Cumplimiento legal automático**: Verifactu y LOPD integrados
- **Tablas especializadas**:
  - `DLegalDocuments`: Tracking de consentimientos
  - `DQuestionnaireResponses`: Respuestas de cuestionarios con LOPD
- **Flujos dinámicos de documentos**:
  - Documentos automáticos por tipo de tratamiento
  - Cuestionarios específicos por procedimiento
  - Validación legal automática antes de envío

### 🧾 Sistema de Facturación
- **Cumplimiento Verifactu**: Conformidad total con la legislación española
- Registro legal automático
- Generación de facturas profesionales
- Numeración automática
- Consulta de facturas legales
- Histórico completo de facturación

### 💰 Control Contable
- Gestión de facturas como Contaplus
- Control de ingresos y gastos
- Reportes financieros
- Conciliación bancaria
- Análisis de rentabilidad por paciente/tratamiento

### ⚙️ Panel de Configuración
- Gestión de usuarios y permisos
- Configuración de acceso
- Parámetros del sistema
- Backup y restauración
- Logs de actividad

## 🎨 Diseño y UX

### Paleta de Colores
- **Azul principal**: #072C (blue 072C)
- **Grises**: Variedad de tonos grises profesionales
- **Acentos**: Líneas delimitadoras en azul oscuro
- **Icono**: Logo personalizado de la clínica (incluido en el proyecto)

### Principios de Diseño
- **Profesional y serio**: Imagen corporativa sólida
- **Interfaz intuitiva**: Navegación clara y eficiente
- **Responsive**: Adaptable a todos los dispositivos
- **Accesibilidad**: Cumplimiento de estándares web

## 🏗️ Arquitectura Técnica

### Backend
- **Framework**: Node.js con Express
- **Base de datos principal**: PostgreSQL (Render.com)
- **Base de datos local**: SQL Server con tabla `dbo.DCitas`
- **Autenticación**: JWT con secret personalizado
- **APIs**: 47+ endpoints especializados
- **Controladores especializados**:
  - `authController.js`: Autenticación y control de acceso
  - `legalController.js`: Documentos legales/LOPD
  - `automationController.js`: Rutas de automatización
  - `whatsappController.js`: Gestión de mensajes y urgencias
  - `agendaController.js`: Gestión avanzada de citas
  - `patientController.js`: Base de datos de pacientes
  - `invoiceController.js`: Facturación Verifactu
- **Puerto**: 3000
- **Entorno**: Production

### Estructura de APIs Especializadas
- **Módulo de Autenticación**: 8 endpoints
- **Módulo Legal/LOPD**: 10 endpoints
- **Módulo de Automatización**: 12 endpoints
- **Módulo WhatsApp/Urgencias**: 8 endpoints
- **Módulo Agenda/Citas**: 7 endpoints
- **Módulo Pacientes**: 6 endpoints
- **Módulo Facturación**: 5 endpoints
- **Módulo Documentos**: 4 endpoints
- **Módulo Contabilidad**: 3 endpoints
- **Total**: 47+ endpoints especializados

### Frontend
- **Tecnología**: HTML5, CSS3, JavaScript ES6+
- **Framework CSS**: Diseño responsive personalizado
- **Compatibilidad**: Navegadores modernos
- **PWA**: Funcionalidades de aplicación web progresiva
- **16 Módulos JavaScript** (16,563 líneas totales):
  - **Configuración**: config.js (323 líneas)
  - **Utilidades**: utils.js (577 líneas)
  - **Autenticación**: auth.js (746 líneas)
  - **API Client**: api.js (697 líneas)
  - **WebSocket**: websocket.js (671 líneas)
  - **Componentes UI**: components.js (940 líneas)
  - **Aplicación principal**: app.js (1,283 líneas)
  - **Dashboard**: dashboard.js (852 líneas)
  - **Gestión de citas**: agenda.js (1,135 líneas)
  - **WhatsApp Business**: whatsapp.js (1,122 líneas)
  - **Gestión de pacientes**: patients.js (1,228 líneas)
  - **Facturación**: invoices.js (1,473 líneas)
  - **Documentos**: documents.js (1,416 líneas)
  - **Contabilidad**: accounting.js (1,193 líneas)
  - **Legal/LOPD**: legal.js (1,495 líneas)
  - **Gestión de usuarios**: users.js (1,443 líneas)

### Integración WhatsApp
- **Biblioteca**: Baileys (no API Business)
- **Funcionalidades**: Envío y recepción de mensajes
- **Automatización**: Completamente integrada con el sistema

## 🌐 Deployment y URLs

### URLs Principales
- **Aplicación principal**: www.app.rubiogarciadental.com
- **Backend API**: https://clinica-dental-backend.onrender.com
- **Repositorio**: https://github.com/Manzanedodelgado/dentalcare-pro

### Configuración de Deployment
- **Plataforma**: Render.com
- **Base de datos**: PostgreSQL integrada
- **Dominio personalizado**: Configurado en www.app.rubiogarciadental.com
- **SSL**: Certificado automático incluido

## 🔐 Credenciales y Configuración

### Variables de Entorno
```env
# Aplicación
NODE_ENV=production
PORT=3000
JWT_SECRET=b79882e078a7911286b880690c51934c95174aacaa2fd718d9e71a0cb31cb27368884f152a567a1953de2cdbc977b783c17374a4977dae95653eccb86ec83812

# Base de Datos SQL Server Local
DB_SERVER=gabinete2\box2
DB_DATABASE=clinica-dental-db

# Administración
ADMIN_USER=JMD
ADMIN_PASSWORD=190582
ADMIN_EMAIL=info@rubiogarciadental.com

# WhatsApp
WHATSAPP_PHONE_NUMBER=34664218253

# Clínica
CLINIC_NAME=Clínica Dental Rubio García

# GitHub
GITHUB_USERNAME=Manzanedodelgado
GITHUB_TOKEN=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
```

### Acceso Administrativo
- **Usuario**: JMD
- **Contraseña**: 190582
- **Email**: info@rubiogarciadental.com
- **Permisos**: Administrador completo del sistema

## 📊 Estructura de Base de Datos

### Tabla Principal: dbo.DCitas (SQL Server)
- Sincronización automática con la aplicación web
- Datos de citas en tiempo real
- Estados de confirmación integrados
- Historial completo de modificaciones

### Base de Datos PostgreSQL (Render.com)
- Usuarios y autenticación
- Configuraciones del sistema
- Logs de actividad
- Datos de WhatsApp
- Documentos generados
- Facturas y contabilidad

## 🔄 Sincronización de Datos

### Flujo de Datos
1. **SQL Server Local** → **Aplicación Web** (Citas en tiempo real)
2. **Aplicación Web** → **WhatsApp** (Comunicación automatizada)
3. **Sistema** → **Verifactu** (Facturación legal)
4. **Todas las operaciones** → **PostgreSQL** (Almacenamiento persistente)

### Automatizaciones
- **Recordatorios de citas**: 24h y 2h antes
- **Confirmaciones**: Automáticas tras confirmación del paciente
- **Consentimientos**: Envío automático pre-cita
- **Cuestionarios**: Primera visita y seguimiento
- **Facturas**: Generación automática post-tratamiento

## 📁 Estructura Completa del Proyecto

```
dentalcare-pro/
├── backend/                     # Backend Node.js
│   ├── controllers/            # Controladores API (13,488 líneas)
│   ├── middleware/             # Middleware personalizado
│   ├── models/                 # Modelos de datos
│   ├── routes/                 # Rutas API
│   ├── utils/                  # Utilidades
│   └── server.js               # Servidor principal
├── frontend/                   # Frontend
│   ├── index.html              # Página principal
│   ├── css/                    # Estilos (8,700+ líneas)
│   │   ├── main.css            # Estilos principales
│   │   ├── dashboard.css       # Dashboard
│   │   ├── agenda.css          # Gestión de citas
│   │   ├── patients.css        # Gestión de pacientes
│   │   ├── invoices.css        # Facturación
│   │   ├── whatsapp.css        # WhatsApp Business
│   │   ├── documents.css       # Documentos
│   │   ├── accounting.css      # Contabilidad
│   │   ├── legal.css           # LOPD y legal
│   │   ├── users.css           # Gestión de usuarios
│   │   ├── auth.css            # Autenticación
│   │   ├── components.css      # Componentes UI
│   │   └── responsive.css      # Diseño responsive
│   └── js/                     # Módulos JavaScript (16,563 líneas)
│       ├── config.js           # Configuración (323 líneas)
│       ├── utils.js            # Utilidades (577 líneas)
│       ├── auth.js             # Autenticación (746 líneas)
│       ├── api.js              # Cliente API (697 líneas)
│       ├── websocket.js        # WebSocket (671 líneas)
│       ├── components.js       # Componentes UI (940 líneas)
│       ├── app.js              # Aplicación principal (1,283 líneas)
│       ├── dashboard.js        # Dashboard (852 líneas)
│       ├── agenda.js           # Gestión de citas (1,135 líneas)
│       ├── whatsapp.js         # WhatsApp Business (1,122 líneas)
│       ├── patients.js         # Gestión de pacientes (1,228 líneas)
│       ├── invoices.js         # Facturación (1,473 líneas)
│       ├── documents.js        # Documentos (1,416 líneas)
│       ├── accounting.js       # Contabilidad (1,193 líneas)
│       ├── legal.js            # LOPD y consentimientos (1,495 líneas)
│       └── users.js            # Gestión de usuarios (1,443 líneas)
├── uploads/                    # Archivos subidos
├── logs/                       # Logs del sistema
├── backups/                    # Respaldos automáticos
├── package.json                # Dependencias Node.js
├── render.yaml                 # Configuración Render.com
├── .env.example                # Variables de entorno ejemplo
├── .gitignore                  # Archivos excluidos de Git
└── README.md                   # Este archivo
```

**Total del proyecto**: 39,000+ líneas de código de alta calidad

## 📋 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- PostgreSQL (Render.com)
- SQL Server Local (gabinete2\box2)
- Git

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/Manzanedodelgado/clinica-dental-backend.git
   cd clinica-dental-backend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con las credenciales proporcionadas
   ```

4. **Inicializar base de datos**
   ```bash
   npm run db:init
   ```

5. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

6. **Deploy a producción (Render.com)**
   ```bash
   npm run deploy
   ```

### Configuración SQL Server
- **Servidor**: gabinete2\box2
- **Base de datos**: clinica-dental-db
- **Tabla**: dbo.DCitas
- **Conexión**: Automática desde la aplicación

## 🧪 Testing y Calidad

### Tipos de Pruebas
- **Unitarias**: Funcionalidades individuales
- **Integración**: Flujos completos de trabajo
- **End-to-End**: Escenarios de usuario reales
- **Carga**: Rendimiento bajo alta demanda

### Estándares de Calidad
- **ESLint**: Código limpio y consistente
- **Prettier**: Formato automático
- **Jest**: Framework de testing
- **Coveralls**: Cobertura de código

## 📈 Monitoreo y Logs

### Sistema de Logs
- **Acceso**: Rastreo de entradas al sistema
- **Errores**: Logging detallado de fallos
- **Actividad**: Registro de todas las operaciones
- **WhatsApp**: Logs de mensajes enviados/recibidos
- **Facturación**: Auditoría de cambios

### Monitoreo
- **Uptime**: Verificación continua del servicio
- **Rendimiento**: Métricas de respuesta
- **Base de datos**: Salud de conexiones
- **WhatsApp**: Estado de conectividad

## 🔒 Seguridad y Cumplimiento Legal Avanzado

### Seguridad
- **Autenticación JWT**: Tokens seguros con expiración configurable
- **Encriptación**: Datos sensibles protegidos en reposo y tránsito
- **CORS**: Configuración segura para múltiples dominios
- **Rate Limiting**: Protección contra ataques y abuso
- **Validación**: Sanitización completa de entradas
- **Audit Trail**: Registro detallado de todas las acciones
- **Control de sesiones**: Gestión automática de sesiones activas

### Cumplimiento Legal Completo
- **Verifactu**: Facturación 100% conforme a ley española
- **LOPD/RGPD**: Cumplimiento automático con auditoría completa
- **Consentimientos Informados**: Gestión automatizada con tracking
- **Cuestionarios Legales**: Primera visita con validación LOPD
- **Trazabilidad Legal**: Audit trail completo para auditorías
- **Tablas de cumplimiento**:
  - `DLegalDocuments`: Tracking de consentimientos informados
  - `DQuestionnaireResponses`: Respuestas de cuestionarios con LOPD
  - `DComplianceLog`: Log de cumplimiento legal automático
- **Automatizaciones legales**:
  - Validación LOPD antes de procesar datos
  - Consentimiento automático para comunicaciones
  - Documentos legales generados automáticamente
  - Registro de aceptación con timestamp legal

## 🚀 Características Avanzadas

### Inteligencia Artificial
- **Procesamiento de lenguaje natural**: Comprensión de mensajes de pacientes
- **Respuestas automáticas**: Basadas en contexto
- **Escalamiento inteligente**: Detección de casos urgentes
- **Aprendizaje**: Mejora continua del agente

### Automatizaciones Avanzadas
- **Flujos de trabajo dinámicos**: 
  - Personalizables por tipo de tratamiento
  - Configuración de documentos automáticos
  - Cuestionarios específicos por procedimiento
  - Condicionantes legales automáticos
- **Programación inteligente**:
  - Envíos a horas específicas por paciente
  - Recordatorios automáticos de citas (24h y 2h antes)
  - Seguimiento post-tratamiento automatizado
  - Confirmaciones automáticas de citas
- **Condiciones legales automáticas**:
  - Validación LOPD antes de cada envío
  - Consentimientos informados automáticos
  - Cuestionarios de primera visita con validación
  - Estados de cita vinculados a cumplimiento legal
- **Integración completa**:
  - SQL Server (dbo.DCitas) para citas
  - WhatsApp para comunicaciones
  - Verifactu para facturación legal
  - Sistema de documentos con audit trail

### Reportes y Analytics
- **Dashboard en tiempo real**: Métricas clave
- **Reportes personalizados**: Configurables por usuario
- **Análisis de tendencias**: Patrones de paciente
- **KPIs**: Indicadores de rendimiento

## 📞 Soporte y Contacto

### Contacto Técnico
- **Email**: info@rubiogarciadental.com
- **Administrador**: Juan Antonio Manzanedo
- **WhatsApp**: 34664218253

### Documentación Adicional
- **API Documentation**: `/docs` (generada automáticamente)
- **User Manual**: Disponible en la aplicación
- **FAQ**: Sección de preguntas frecuentes
- **Updates**: Historial de versiones

## 📝 Notas Importantes

### Configuración Específica
- La aplicación está configurada para acceso exclusivo vía www.app.rubiogarciadental.com
- Todas las comunicaciones WhatsApp se gestionan sin API Business
- El sistema respeta completamente la estructura de datos de SQL Server
- La facturación cumple al 100% con Verifactu

### Mantenimiento
- **Backup automático**: Base de datos PostgreSQL
- **Actualizaciones**: Sin downtime programado
- **Monitoreo**: 24/7 del sistema
- **Soporte**: Respuesta inmediata en horario laboral

### Escalabilidad
- **Render.com**: Escalado automático
- **PostgreSQL**: Alta disponibilidad
- **Optimización**: Rendimiento optimizado
- **Capacity**: Preparado para crecimiento

---

## 📦 Instalación Rápida

### Clonar el Repositorio
```bash
git clone https://github.com/Manzanedodelgado/dentalcare-pro.git
cd dentalcare-pro
npm install
```

### Configurar Variables de Entorno
```bash
cp .env.example .env
# Editar .env con las credenciales proporcionadas

```

### Ejecutar en Desarrollo
```bash
npm run dev
```

### Deploy a Producción
```bash
npm run deploy
```

---

## 🎯 Resumen de Funcionalidades Clave

✅ **Control de Acceso Multi-nivel** con permisos granulares  
✅ **Panel de Control** con dashboard en tiempo real  
✅ **Agenda Avanzada** sincronizada con SQL Server dbo.DCitas  
✅ **Sistema de Urgencias WhatsApp** con codificación en naranja  
✅ **47+ APIs Especializadas** para máxima funcionalidad  
✅ **Agente IA Avanzado** con automatizaciones inteligentes  
✅ **Cumplimiento Legal LOPD/RGPD** automático con audit trail  
✅ **Facturación Verifactu** conforme a ley española  
✅ **Estados de Citas Editables** con relación directa a automatizaciones  
✅ **Documentos y Cuestionarios** con validación legal automática  

---

**Desarrollado para Clínica Dental Rubio García**  
*DentalCare Pro - Sistema completo de gestión dental con IA avanzada y cumplimiento legal total*

**Repositorio**: [dentalcare-pro](https://github.com/Manzanedodelgado/dentalcare-pro)  
**Dominio**: www.app.rubiogarciadental.com  
**Versión**: 1.0.0  
**Fecha**: Noviembre 2025  
**Estado**: Producción activa