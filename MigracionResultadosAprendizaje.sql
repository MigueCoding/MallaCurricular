/*
  Módulo de resultados de aprendizaje (SQL Server / MallaDB).
  Es idempotente: ejecutar una vez antes de publicar el código. Los textos de
  inicio viven aquí como seed, no en HTML ni JavaScript.
*/
USE MallaDB;
GO
SET XACT_ABORT ON;
GO

IF OBJECT_ID('dbo.RA_Programa', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RA_Programa (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RA_Programa PRIMARY KEY,
        Codigo NVARCHAR(80) NOT NULL CONSTRAINT UQ_RA_Programa_Codigo UNIQUE,
        PerfilEgreso NVARCHAR(MAX) NOT NULL,
        PerfilOcupacional NVARCHAR(MAX) NOT NULL,
        TituloCompetencias NVARCHAR(500) NOT NULL,
        Activo BIT NOT NULL CONSTRAINT DF_RA_Programa_Activo DEFAULT 1,
        CreadoEn DATETIME NOT NULL CONSTRAINT DF_RA_Programa_CreadoEn DEFAULT GETDATE(),
        ActualizadoEn DATETIME NOT NULL CONSTRAINT DF_RA_Programa_ActualizadoEn DEFAULT GETDATE()
    );
END;
GO
IF OBJECT_ID('dbo.RA_Competencia', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RA_Competencia (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RA_Competencia PRIMARY KEY,
        ProgramaId INT NOT NULL CONSTRAINT FK_RA_Competencia_Programa REFERENCES dbo.RA_Programa(Id),
        Codigo NVARCHAR(50) NOT NULL,
        Descripcion NVARCHAR(MAX) NOT NULL,
        Orden INT NOT NULL CONSTRAINT CK_RA_Competencia_Orden CHECK (Orden > 0),
        Activo BIT NOT NULL CONSTRAINT DF_RA_Competencia_Activo DEFAULT 1,
        CreadoEn DATETIME NOT NULL CONSTRAINT DF_RA_Competencia_CreadoEn DEFAULT GETDATE(),
        ActualizadoEn DATETIME NOT NULL CONSTRAINT DF_RA_Competencia_ActualizadoEn DEFAULT GETDATE()
    );
    CREATE UNIQUE INDEX UX_RA_Competencia_Codigo_Activo ON dbo.RA_Competencia(ProgramaId, Codigo) WHERE Activo = 1;
END;
GO
IF OBJECT_ID('dbo.RA_Resultado', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RA_Resultado (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RA_Resultado PRIMARY KEY,
        CompetenciaId INT NOT NULL CONSTRAINT FK_RA_Resultado_Competencia REFERENCES dbo.RA_Competencia(Id),
        Codigo NVARCHAR(50) NOT NULL,
        Descripcion NVARCHAR(MAX) NOT NULL,
        Orden INT NOT NULL CONSTRAINT CK_RA_Resultado_Orden CHECK (Orden > 0),
        Activo BIT NOT NULL CONSTRAINT DF_RA_Resultado_Activo DEFAULT 1,
        CreadoEn DATETIME NOT NULL CONSTRAINT DF_RA_Resultado_CreadoEn DEFAULT GETDATE(),
        ActualizadoEn DATETIME NOT NULL CONSTRAINT DF_RA_Resultado_ActualizadoEn DEFAULT GETDATE()
    );
    CREATE UNIQUE INDEX UX_RA_Resultado_Codigo_Activo ON dbo.RA_Resultado(CompetenciaId, Codigo) WHERE Activo = 1;
END;
GO
IF OBJECT_ID('dbo.RA_Momento', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RA_Momento (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RA_Momento PRIMARY KEY,
        ResultadoId INT NOT NULL CONSTRAINT FK_RA_Momento_Resultado REFERENCES dbo.RA_Resultado(Id),
        Codigo NVARCHAR(50) NOT NULL,
        Descripcion NVARCHAR(MAX) NOT NULL,
        Orden INT NOT NULL CONSTRAINT CK_RA_Momento_Orden CHECK (Orden > 0),
        Activo BIT NOT NULL CONSTRAINT DF_RA_Momento_Activo DEFAULT 1,
        CreadoEn DATETIME NOT NULL CONSTRAINT DF_RA_Momento_CreadoEn DEFAULT GETDATE(),
        ActualizadoEn DATETIME NOT NULL CONSTRAINT DF_RA_Momento_ActualizadoEn DEFAULT GETDATE()
    );
END;
GO
IF OBJECT_ID('dbo.RA_Version', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RA_Version (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RA_Version PRIMARY KEY,
        ProgramaId INT NOT NULL CONSTRAINT FK_RA_Version_Programa REFERENCES dbo.RA_Programa(Id),
        Version INT NOT NULL,
        FechaCambio DATETIME NOT NULL CONSTRAINT DF_RA_Version_Fecha DEFAULT GETDATE(),
        UsuarioId INT NULL,
        Accion NVARCHAR(300) NOT NULL,
        VersionOrigen INT NULL,
        SnapshotJson NVARCHAR(MAX) NOT NULL,
        CONSTRAINT UQ_RA_Version_Programa_Version UNIQUE(ProgramaId, Version)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.RA_Programa WHERE Codigo = N'TEC_DESARROLLO_SOFTWARE')
BEGIN
    BEGIN TRANSACTION;
    DECLARE @ProgramaId INT, @C1 INT, @C2 INT, @C3 INT, @C4 INT, @C5 INT, @C6 INT, @C7 INT;
    DECLARE @RA1 INT, @RA5 INT, @RA2 INT, @RA3 INT, @RA4 INT, @RAT1 INT, @RAG2 INT, @RAG1 INT, @RAG3 INT, @RAG4 INT;

    INSERT INTO dbo.RA_Programa(Codigo, PerfilEgreso, PerfilOcupacional, TituloCompetencias)
    VALUES (N'TEC_DESARROLLO_SOFTWARE',
N'El Tecnólogo en Desarrollo de Software del Instituto Tecnológico Metropolitano, identifica y define requisitos de Sistemas de información, apoya el diseño y administración de sistemas de información bajo lineamientos o estándares nacionales o internacionales. Desarrolla soluciones de software y de servicios bajo distintas plataformas tecnológicas aplicando metodologías vigentes de desarrollo de software. Diseña y construye modelos para repositorios de datos. Realiza pruebas funcionales para evaluar la calidad e integridad del software. Apoya la formulación y evaluación de proyectos de software. Capacitado para trabajar en equipos multidisciplinares, inter-culturales e internacionales y reconoce responsabilidades éticas y profesionales en contextos tecnológicos, sociales, ambientales y económicos.',
N'Soporte a usuarios: Como persona capaz de dar entrenamiento, soporte, resolver problemas operativos y técnicos a los usuarios de los sistemas de información.

Desarrollador de software: Persona capaz de participar en un grupo de investigación y desarrollo de sistemas informáticos, asumiendo la función de diseñador y desarrollador del componente computacional, de común acuerdo con los demás miembros del grupo.

Analista de sistemas: Persona que asume la función de analista y especificador de necesidades y soluciones informáticas, así como responsable último del desarrollo, prueba, implantación y entrenamiento a usuarios de los sistemas generados.

Administrador de servicios informáticos: Persona responsable por la provisión de servicios informáticos o tele-informáticos que sirven de base a la labor de una organización. Es capaz no solamente de mantener en funcionamiento la infraestructura requerida para esto, sino de coordinar un adecuado mantenimiento y renovación de equipos y sistemas computacionales base.

Director de Sistemas en pequeñas y medianas empresas (PyMES): Persona a cuyo cargo están todos los servicios informáticos de una organización, así como la infraestructura tecnológica, técnica y humana que los hacen posibles. Lidera la identificación de oportunidades informáticas para el cumplimiento de la misión corporativa y para el aumento de su eficiencia. Es un gerente de servicios informáticos capaz de articular éstos con los demás recursos de la organización.

Empresario: Persona que tiene iniciativa propia, capaz de identificar sectores o nichos en los que se puede desempeñar una gestión de liderazgo en la innovación o el mejoramiento apoyados con la informática, capaz de articular demanda y oferta de servicios (propia o ajena) para lograr dicho cambio.',
N'Competencia del programa a la que aporta la asignatura');
    SET @ProgramaId = SCOPE_IDENTITY();

    INSERT dbo.RA_Competencia(ProgramaId,Codigo,Descripcion,Orden) VALUES (@ProgramaId,N'C1',N'Capacidad de Analizar problemas complejos relacionados con sistemas de información y aplicar principios de la computación, estándares nacionales e internacionales y otras disciplinas relevantes para identificar soluciones efectivas.',1); SET @C1=SCOPE_IDENTITY();
    INSERT dbo.RA_Competencia(ProgramaId,Codigo,Descripcion,Orden) VALUES (@ProgramaId,N'C2',N'Capacidad para diseñar, implementar y evaluar soluciones de software y servicios basados en requisitos específicos, utilizando metodologías vigentes de desarrollo de software y considerando diversas plataformas tecnológicas.',2); SET @C2=SCOPE_IDENTITY();
    INSERT dbo.RA_Competencia(ProgramaId,Codigo,Descripcion,Orden) VALUES (@ProgramaId,N'C3',N'Capacidad para identificar, formular y resolver problemas del área de la ingeniería aplicando los principios de la ingeniería, las ciencias y las matemáticas.',3); SET @C3=SCOPE_IDENTITY();
    INSERT dbo.RA_Competencia(ProgramaId,Codigo,Descripcion,Orden) VALUES (@ProgramaId,N'C4',N'Capacidad para comunicar de manera clara y efectiva en diferentes contextos profesionales, incluyendo equipos multidisciplinarios, interculturales e internacionales.',4); SET @C4=SCOPE_IDENTITY();
    INSERT dbo.RA_Competencia(ProgramaId,Codigo,Descripcion,Orden) VALUES (@ProgramaId,N'C5',N'Capacidad reconocer y asumir responsabilidades éticas y profesionales en el desarrollo de soluciones tecnológicas, considerando su impacto en contextos sociales, ambientales y económicos.',5); SET @C5=SCOPE_IDENTITY();
    INSERT dbo.RA_Competencia(ProgramaId,Codigo,Descripcion,Orden) VALUES (@ProgramaId,N'C6',N'Capacidad para trabajar de manera eficiente como miembro o líder en equipos multidisciplinarios, aplicando buenas prácticas de colaboración y estándares tecnológicos en la gestión de proyectos de software.',6); SET @C6=SCOPE_IDENTITY();
    INSERT dbo.RA_Competencia(ProgramaId,Codigo,Descripcion,Orden) VALUES (@ProgramaId,N'C7',N'Capacidad para integrar nuevos conocimientos en su práctica profesional, utilizando estrategias de aprendizaje efectivas según las demandas del entorno.',7); SET @C7=SCOPE_IDENTITY();

    INSERT dbo.RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden) VALUES(@C1,N'RA1',N'Analiza los requisitos para el desarrollo del software, teniendo en cuenta los lineamientos y estándares de la industria',1); SET @RA1=SCOPE_IDENTITY();
    INSERT dbo.RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden) VALUES(@C1,N'RA5',N'Administra sistemas de software de acuerdo con los parámetros técnicos y lineamientos de la industria',2); SET @RA5=SCOPE_IDENTITY();
    INSERT dbo.RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden) VALUES(@C2,N'RA2',N'Diseña software de acuerdo con los requisitos de la organización y los estándares de la industria.',1); SET @RA2=SCOPE_IDENTITY();
    INSERT dbo.RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden) VALUES(@C2,N'RA3',N'Programa el software de acuerdo con las especificaciones del diseño de la solución, los requisitos de la organización y los estándares de la industria.',2); SET @RA3=SCOPE_IDENTITY();
    INSERT dbo.RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden) VALUES(@C2,N'RA4',N'Prueba la solución del software de acuerdo con los requisitos de la organización, los modelos de referencia y los estándares de la industria.',3); SET @RA4=SCOPE_IDENTITY();
    INSERT dbo.RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden) VALUES(@C3,N'RAT1',N'Soluciona problemas de ingeniería de forma sistémica. (Resolver problemas)',1); SET @RAT1=SCOPE_IDENTITY();
    INSERT dbo.RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden) VALUES(@C4,N'RAG2',N'Participa activamente en equipos de trabajo multidisciplinarios, empleando estrategias de comunicación efectiva para la coordinación y gestión de proyectos de software.',1); SET @RAG2=SCOPE_IDENTITY();
    INSERT dbo.RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden) VALUES(@C5,N'RAG1',N'Aplica de manera efectiva principios morales establecidos para la práctica de la ingeniería en los que se evidencia la toma de decisiones responsables de acuerdo con aspectos regulatorios, normativos y de buenas prácticas. (Ética)',1); SET @RAG1=SCOPE_IDENTITY();
    INSERT dbo.RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden) VALUES(@C6,N'RAG3',N'Planifica y ejecuta actividades que lo lleven al cumplimiento de metas, respetando las características del trabajo cooperativo. (Trabajo en equipo)',1); SET @RAG3=SCOPE_IDENTITY();
    INSERT dbo.RA_Resultado(CompetenciaId,Codigo,Descripcion,Orden) VALUES(@C7,N'RAG4',N'Identifica, selecciona y aplica nuevos conocimientos en su campo de formación, utilizando estrategias de aprendizaje adecuadas para responder a las necesidades del entorno profesional y tecnológico.',1); SET @RAG4=SCOPE_IDENTITY();

    INSERT dbo.RA_Momento(ResultadoId,Codigo,Descripcion,Orden) VALUES
    (@RA1,N'M1',N'Identifica y describe correctamente los estándares internacionales relacionados con la especificación de requisitos.',1),
    (@RA1,N'M1',N'Relaciona los lineamientos teóricos con su impacto en la calidad del producto final (por ejemplo, cumplimiento de especificaciones, reducción de ambigüedades, satisfacción de los Directivos (stakeholders)).',2),
    (@RA1,N'M2',N'El estudiante identifica debilidades en cada etapa de implementación de un ERP, propone estrategias tecnológicas para superarlas y presenta un informe estructurado con introducción, desarrollo, conclusiones y bibliografía en norma APA, demostrando análisis crítico y cumplimiento de los requisitos establecidos.',3),
    (@RA2,N'M1',N'Analizar los requerimientos del sistema para determinar las entidades, atributos y relaciones necesarios, asegurando que reflejen correctamente los procesos del negocio y las necesidades de los usuarios.',1),
    (@RA2,N'M2',N'El estudiante propone soluciones de software que responden a los requisitos del sistema, utilizando principios de diseño estructurado u orientado a objetos, garantizando modularidad, escalabilidad y coherencia. Las soluciones incluyen diagramas y modelos claros que representan la estructura y el comportamiento del sistema, con documentación técnica que justifica las decisiones de diseño y asegura la alineación con estándares y metodologías vigentes.',2),
    (@RA3,N'M1',N'Comprende los principios fundamentales de la Programación Orientada a Objetos (POO), asegurando la correcta definición de clases, atributos y métodos con encapsulación, herencia, polimorfismo y abstracción, aplicando estándares de codificación y validando el funcionamiento mediante pruebas que garantizan modularidad, reutilización y escalabilidad del sistema.',1),
    (@RA4,N'M2',N'El estudiante valida el funcionamiento del software mediante la ejecución de pruebas sistemáticas que verifican el cumplimiento de los requisitos de la organización, utilizando modelos de referencia y estándares de la industria. Las pruebas incluyen escenarios funcionales y no funcionales, documentando los resultados, identificando desviaciones y proponiendo ajustes necesarios para garantizar la calidad y la alineación del software con los objetivos del proyecto.',1),
    (@RAT1,N'M1',N'Valida la solución propuesta a través de pruebas y simulaciones, asegurando su eficacia en entornos reales.',1),
    (@RAT1,N'M2',N'Evalúa la precisión y confiabilidad de modelos y cálculos utilizados en el diseño de soluciones tecnológicas.',2),
    (@RAT1,N'M3',N'Analiza un problema del ámbito del desarrollo de software, identificando sus causas y efectos a partir de principios matemáticos y científicos.',3),
    (@RAT1,N'M4',N'Formula soluciones utilizando principios de ingeniería de software.',4),
    (@RAG2,N'M1',N'Elabora documentación técnica y funcional con lenguaje claro y estructurado, adaptado a diferentes audiencias (usuarios finales, desarrolladores y directivos/stakeholders).',1),
    (@RAG2,N'M2',N'Expone ideas y conceptos técnicos en reuniones de equipo, utilizando términos adecuados y asegurando la comprensión por parte de los interlocutores.',2),
    (@RAG2,N'M3',N'Argumenta y defiende sus ideas en discusiones técnicas y toma de decisiones dentro de un equipo de trabajo.',3),
    (@RAG2,N'M4',N'Escucha activamente a los integrantes del equipo y formula preguntas o comentarios que favorezcan la resolución de problemas y el trabajo colaborativo.',4),
    (@RAG1,N'M1',N'Analiza dilemas éticos en el desarrollo de software y propone soluciones alineadas con principios de responsabilidad profesional.',1),
    (@RAG1,N'M2',N'Desarrolla software aplicando prácticas que garanticen la seguridad de los datos, la privacidad de los usuarios y el cumplimiento de normativas.',2),
    (@RAG1,N'M3',N'Evalúa el impacto social y ético de las decisiones tomadas en el diseño y desarrollo de soluciones tecnológicas.',3),
    (@RAG3,N'M1',N'Emplea herramientas y estándares tecnológicos (control de versiones, integración continua y/o pruebas automatizadas) para mejorar la productividad del equipo.',1),
    (@RAG3,N'M2',N'Implementa estrategias de coordinación y comunicación efectiva dentro del equipo, asegurando la alineación con los objetivos del proyecto.',2),
    (@RAG3,N'M3',N'Propone mejoras en los procesos de trabajo, aplicando principios de desarrollo ágil y gestión eficiente de proyectos.',3),
    (@RAG4,N'M1',N'Consulta fuentes actualizadas y confiables para identificar nuevas tendencias, metodologías y herramientas en el desarrollo de software.',1),
    (@RAG4,N'M2',N'Implementa estrategias de autoaprendizaje como cursos en línea, proyectos prácticos o comunidades de práctica para fortalecer su conocimiento.',2),
    (@RAG4,N'M3',N'Compara el impacto de los nuevos conocimientos adquiridos y su aplicabilidad en escenarios reales del desarrollo de software.',3);
    COMMIT TRANSACTION;
END;
GO
