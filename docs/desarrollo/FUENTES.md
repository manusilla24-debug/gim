# Fuentes y selección de perfiles

Fecha de adaptación: 19 de octubre de 2026.

Fuente principal: [Agency Agents](https://github.com/msitarzewski/agency-agents),
revisión consultada `652b2692f8d8ec2b1f1a38e559073e287dfdc469`.
El inventario consultado contiene 282 perfiles en 18 divisiones. Estas cifras
describen esa revisión, no una promesa sobre el catálogo futuro.

Las instrucciones locales son redacción propia para Registro de Fuerza. Se
aprovecha la idea de perspectivas especializadas; no se incorporan agentes
ejecutables, instaladores, ejemplos de código, personalidades o memorias ficticias.
Las tablas son una valoración para este proyecto, no una clasificación del autor
original. Los enlaces de carpetas siguientes fijan la revisión consultada.

## Inventario completo y filtro

| División | Cantidad | Decisión |
| --- | ---: | --- |
| Engineering | 65 | Seleccionar revisión, frontend, privacidad, gráficos y mantenimiento. |
| Design | 10 | Seleccionar UX, accesibilidad y coherencia de interfaz. |
| Testing | 9 | Seleccionar pruebas, evidencia y rendimiento; sin instalar suites. |
| Security | 12 | Seleccionar riesgos del navegador y del repositorio. |
| Product | 6 | Seleccionar prioridades, feedback e investigación. |
| Project Management | 7 | Usar referencias puntuales de planificación. |
| Research | 1 | Usar síntesis de fuentes en decisiones que lo requieran. |
| Support | 6 | Usar diagnóstico y documentación puntualmente. |
| Specialized | 59 | Seleccionar flujos, auditoría del código y planificación. |
| Academic | 6 | Estadística puntual; resto sin necesidad actual. |
| Healthcare | 3 | Evidencia puntual; no gestión sanitaria ni estrategia clínica. |
| Marketing | 37 | Solo SEO puntual si se solicita. |
| Paid Media | 7 | No incorporar publicidad ni seguimiento. |
| Sales | 9 | No hay proceso comercial que cubrir. |
| Finance | 5 | No hay funciones financieras que cubrir. |
| Game Development | 21 | No hay videojuego que desarrollar. |
| GIS | 13 | No hay información geográfica que gestionar. |
| Spatial Computing | 6 | No hay XR ni aplicación nativa espacial. |
| **Total** | **282** | Agrupar la selección útil en nueve perfiles propios. |

## Esenciales: responsabilidades que hay que cubrir

No significa instalar estos agentes ni leerlos en cada tarea. Los nombres son
los de sus fichas; se indica dónde queda su responsabilidad en las guías locales.

| Nombre exacto | División | Aplicación y adaptación | Perfil local |
| --- | --- | --- | --- |
| Code Reviewer | Engineering | Hallazgos reproducibles; añadir comprobaciones de atletas, sesiones e IDs. | Revisión |
| Minimal Change Engineer | Engineering | Cambios mínimos; evitar reescrituras de la app al corregir un detalle. | Revisión |
| Frontend Developer | Engineering | Formularios y móvil; sustituir frameworks por HTML/CSS/JS nativos. | Frontend y accesibilidad |
| Accessibility Auditor | Testing | Foco, teclado, etiquetas y tablas; sin herramientas obligatorias. | Frontend y accesibilidad |
| Evidence Collector | Testing | Pasos y evidencias; no usar capturas como única prueba de datos. | QA y persistencia |
| Reality Checker | Testing | Separar observado y no probado; quitar certificaciones desproporcionadas. | QA y persistencia |
| Application Security Engineer | Security | Entradas, DOM y CSP; sin servicios de análisis nuevos. | Seguridad y privacidad |
| Privacy Engineer | Engineering | Datos locales y copias; quitar infraestructura de APIs y borrado distribuido. | Seguridad y privacidad |
| UX Researcher | Design | Observar fricción al registrar; sin analítica ni investigación inventada. | UX de gimnasio |
| UX Architect | Design | Ordenar acciones y estados; conservar estructura y tokens existentes. | UX de gimnasio |

## Muy recomendables: agrupados, sin archivos duplicados

| Nombre exacto | División | Aplicación y adaptación | Perfil local |
| --- | --- | --- | --- |
| UI Designer | Design | Legibilidad y coherencia; sin nueva biblioteca visual. | Frontend y accesibilidad |
| Performance Benchmarker | Testing | Medir escritura, arranque e historial; quitar pruebas de servidores. | Rendimiento y gráficos |
| Data Visualization Engineer | Engineering | Escalas, unidades y tablas; usar SVG propio, sin D3/Vega. | Rendimiento y gráficos |
| Technical Writer | Engineering | Uso, copias y despliegue; Markdown sin generadores. | Documentación y mantenimiento |
| Software Architect | Engineering | Evaluar límites y alternativas; evitar capas sin utilidad. | Revisión |
| Workflow Architect | Specialized | Mapear terminar, cancelar, importar y recuperarse de errores. | UX de gimnasio / QA y persistencia |
| Product Manager | Product | Definir problemas y aceptación; sin objetivos comerciales. | Producto e investigación |
| Feedback Synthesizer | Product | Agrupar observaciones aportadas; sin canales conectados ni seguimiento. | Producto e investigación |
| Codebase Onboarding Engineer | Engineering | Explicar rutas reales de ejecución; leer antes de afirmar. | Documentación y mantenimiento |
| Codebase Archaeologist | Specialized | Auditar divergencias acumuladas solo cuando sea pertinente. | Documentación y mantenimiento |

## Referencias para tareas puntuales

No crean perfiles nuevos. Sus criterios se usan solo si hay una tarea concreta;
las instrucciones originales no se aplican completas ni prevalecen sobre AGENTS.md.

| Nombre exacto | División | Tarea útil y límite | Perfil receptor |
| --- | --- | --- | --- |
| Git Workflow Master | Engineering | Separar commits; sin imponer GitFlow ni reescribir historial. | Documentación y mantenimiento |
| Internationalization Engineer | Engineering | Coma decimal, fechas y pluralización con Intl; sin sistema multilingüe. | Frontend y accesibilidad / QA y persistencia |
| Section 508 Accessibility Specialist | Engineering | Profundizar en ARIA y lectores; no importar obligaciones legales estadounidenses. | Frontend y accesibilidad |
| DevOps Automator | Engineering | Revisar rutas y publicación Vercel; sin contenedores ni pipelines nuevos. | PWA y offline |
| SRE (Site Reliability Engineer) | Engineering | Diagnosticar actualización fallida; sin telemetría ni guardias. | PWA y offline |
| Developer Tooling Engineer | Engineering | Simplificar comprobaciones existentes; no crear un gestor de herramientas. | Documentación y mantenimiento |
| Prompt Engineer | Engineering | Aclarar instrucciones locales; no añadir IA a la app. | Documentación y mantenimiento |
| Incident Response Commander | Engineering | Acotar una regresión grave y su recuperación; sin organización de guardias. | QA y persistencia |
| Persona Walkthrough Specialist | Design | Recorridos con una mano e interrupciones; simulación, no prueba con usuarios. | UX de gimnasio |
| UI Finish-Gate Reviewer | Design | Acabado tras cambios amplios; sin rediseño por gusto. | Frontend y accesibilidad |
| Brand Guardian | Design | Nombres y tono coherentes; sin estrategia de marca independiente. | Frontend y accesibilidad |
| Sprint Prioritizer | Product | Priorizar utilidad, esfuerzo y riesgo; sin ceremonias obligatorias. | Producto e investigación |
| Trend Researcher | Product | Comparar patrones públicos; sin copiar funciones por moda. | Producto e investigación |
| DX Engineer | Product | Facilitar retomar el desarrollo; quitar foco en SDKs. | Documentación y mantenimiento |
| Senior Project Manager | Project Management | Dividir tareas grandes en entregas comprobables. | Producto e investigación |
| Experiment Tracker | Project Management | Comparar manualmente alternativas; sin plataforma A/B ni seguimiento. | Producto e investigación |
| Test Results Analyzer | Testing | Consolidar pruebas; sin inventar cobertura o porcentajes. | QA y persistencia |
| Test Automation Engineer | Testing | Diseñar casos repetibles; Playwright/Cypress necesitan una decisión aparte. | QA y persistencia |
| Tool Evaluator | Testing | Comparar herramientas si se solicita; incluir alternativa sin instalar nada. | Producto e investigación |
| Workflow Optimizer | Testing | Mejorar el procedimiento de comprobación y publicación. | Documentación y mantenimiento |
| Security Architect | Security | Límites de confianza del JSON, navegador y origen; modelo pequeño. | Seguridad y privacidad |
| AI-Generated Code Security Auditor | Security | Revisar código asistido; quitar Supabase, RLS y aplicaciones LLM. | Seguridad y privacidad |
| Senior SecOps Engineer | Security | CSP, cabeceras y exposición; sin sistemas de cuentas. | Seguridad y privacidad |
| Secrets & Credential Hygiene Engineer | Security | Evitar credenciales en commits; sin bóvedas o secretos dentro de la app. | Seguridad y privacidad |
| Penetration Tester | Security | Entradas manipuladas en local y aisladas; sin probar sistemas ajenos. | Seguridad y privacidad |
| Support Responder | Support | Guías de copias y problemas; no prometer recuperación imposible. | Documentación y mantenimiento |
| Infrastructure Maintainer | Support | Diagnóstico de rutas y cabeceras; sin servidores añadidos. | PWA y offline |
| Research Synthesist | Research | Contrastar fuentes y distinguir inferencias. | Producto e investigación |
| Statistician | Academic | Evitar conclusiones engañosas sobre pocas sesiones; sin paquetes. | Rendimiento y gráficos |
| Clinical Evidence Agent | Healthcare | Revisar afirmaciones físicas si se solicitan; sin convertir la app en producto clínico. | Producto e investigación |
| Data Privacy Officer | Specialized | Preguntas sobre datos y textos; sin programa corporativo ni certificación legal. | Seguridad y privacidad |
| Master Plan Architect | Specialized | Criticar cambios grandes; reducir planificación excesiva. | Producto e investigación |
| Cultural Intelligence Strategist | Specialized | Detectar supuestos excluyentes; sin investigaciones ficticias. | UX de gimnasio |
| Language Translator | Specialized | Explicar referencias externas en español; sin añadir idiomas a la app. | Documentación y mantenimiento |
| Legal Compliance Checker | Support | Revisar licencias y dudas; no sustituye asesoramiento profesional. | Documentación y mantenimiento |
| SEO Specialist | Marketing | Título y descripción pública si se pide; sin analítica. | Documentación y mantenimiento |

## Qué no incorporamos y por qué

- Backend Architect, Database Optimizer, Database Reliability Engineer y Data
  Engineer: no hay backend, SQL ni plataforma de datos. La persistencia local
  tiene su propia guía adaptada; no requiere cambiar el almacenamiento.
- Mobile App Builder, Mobile Release Engineer y Desktop App Engineer: no se
  convierte la PWA en app nativa, Electron o una publicación en tiendas.
- AI Engineer, RAG Pipeline Engineer, LLM Post-Training Engineer y AI Data
  Remediation Engineer: no se añade IA a la aplicación.
- Identity & Access Engineer y Realtime Collaboration Engineer: no se incorporan
  cuentas, control de acceso remoto o sincronización.
- Agents Orchestrator, Multi-Agent Systems Architect y Agentic Identity & Trust
  Architect: las guías no requieren delegación ni infraestructura multiagente.
- API Tester y API Platform Engineer: no existe una API de negocio que probar.
- Cloud Security Architect, Threat Detection Engineer, Threat Intelligence
  Analyst, Compliance Auditor y FedRAMP & RMF Compliance Engineer: su
  infraestructura o certificaciones no corresponden al alcance actual.
- Behavioral Nudge Engine y Personal Growth Mentor: no se añaden presión de uso,
  coaching ni comunicaciones. UX puede revisar mensajes respetuosos.
- Whimsy Injector, Visual Storyteller, Image Prompt Engineer e Inclusive Visuals
  Specialist: no hay una tarea actual de ilustración o efectos que los justifique.
- PDF Engine Architect, Universal Document Compiler y Document Generator:
  la impresión existente no exige un sistema de generación de documentos.
- Healthcare Innovation Strategist y Sovereign Health Systems Agent: no hay
  estrategia sanitaria ni relaciones institucionales que desarrollar.
- El resto de plataformas, redes, firmware, comercio, pagos, blockchain, voz,
  vídeo, publicidad, ventas, finanzas, videojuegos, GIS y XR no cubre una
  necesidad actual. Tampoco se añaden humanidades o especialidades sectoriales
  por una coincidencia superficial con nombres o funciones de la app.

## Enlaces y mantenimiento de las fuentes

- [Engineering](https://github.com/msitarzewski/agency-agents/tree/652b2692f8d8ec2b1f1a38e559073e287dfdc469/engineering)
- [Design](https://github.com/msitarzewski/agency-agents/tree/652b2692f8d8ec2b1f1a38e559073e287dfdc469/design)
- [Testing](https://github.com/msitarzewski/agency-agents/tree/652b2692f8d8ec2b1f1a38e559073e287dfdc469/testing)
- [Security](https://github.com/msitarzewski/agency-agents/tree/652b2692f8d8ec2b1f1a38e559073e287dfdc469/security)
- [Product](https://github.com/msitarzewski/agency-agents/tree/652b2692f8d8ec2b1f1a38e559073e287dfdc469/product)
- [Specialized](https://github.com/msitarzewski/agency-agents/tree/652b2692f8d8ec2b1f1a38e559073e287dfdc469/specialized)
- [Catálogo completo](https://github.com/msitarzewski/agency-agents/tree/652b2692f8d8ec2b1f1a38e559073e287dfdc469)

Para localizar cualquier candidato, usa su nombre exacto en el catálogo de esa
revisión. Para explicar su elección consulta la tabla correspondiente arriba.

La fuente original está bajo [licencia MIT](https://github.com/msitarzewski/agency-agents/blob/652b2692f8d8ec2b1f1a38e559073e287dfdc469/LICENSE).
Estas guías no reproducen texto sustancial del catálogo. Si una actualización
incorpora copias o adaptaciones sustanciales de su texto, conserva el aviso y el
texto completo de licencia junto a la adaptación y documenta su procedencia.

Antes de añadir una fuente, comprueba su utilidad concreta, conflictos con
AGENTS.md, dependencias y permisos que presupone. Registra revisión y adaptación.
No ejecutes instaladores ni actualices instrucciones desde fuentes externas de
forma automática. No es necesario mantener sincronía con las 282 fichas.
