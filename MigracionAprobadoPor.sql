USE [MallaDB];
GO

-- Agregar columna VisibleParaTodos a la tabla Microdisenos
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Microdisenos]') AND name = 'VisibleParaTodos')
BEGIN
    ALTER TABLE [dbo].[Microdisenos] ADD VisibleParaTodos BIT NOT NULL DEFAULT 0;
    PRINT 'Columna VisibleParaTodos agregada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La columna VisibleParaTodos ya existe.';
END
GO
