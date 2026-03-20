USE [MallaDB];
GO

IF OBJECT_ID(N'[dbo].[Grupos]', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Grupos] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [Nombre] nvarchar(100) NOT NULL,
        [CursoCodigo] varchar(10) NOT NULL,
        [ProfesorId] int NOT NULL,
        [Novedades] nvarchar(max) NULL,
        CONSTRAINT [PK_Grupos] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Grupos_Cursos] FOREIGN KEY ([CursoCodigo]) REFERENCES [dbo].[Cursos]([Codigo]) ON DELETE CASCADE,
        CONSTRAINT [FK_Grupos_Usuarios] FOREIGN KEY ([ProfesorId]) REFERENCES [dbo].[Usuarios]([id_usuario]) ON DELETE NO ACTION
    );
    PRINT 'Tabla Grupos creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La tabla Grupos ya existía.';
END
GO

IF OBJECT_ID(N'[dbo].[Inscripciones]', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Inscripciones] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [GrupoId] int NOT NULL,
        [EstudianteId] int NOT NULL,
        CONSTRAINT [PK_Inscripciones] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Inscripciones_Grupos] FOREIGN KEY ([GrupoId]) REFERENCES [dbo].[Grupos]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Inscripciones_Usuarios] FOREIGN KEY ([EstudianteId]) REFERENCES [dbo].[Usuarios]([id_usuario]) ON DELETE NO ACTION
    );
    PRINT 'Tabla Inscripciones creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La tabla Inscripciones ya existía.';
END
GO
