USE [MallaDB];
GO

-- Agregar columna FechaEnvio a la tabla Microdisenos (fecha en que el creador envía al aval)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Microdisenos]') AND name = 'FechaEnvio')
BEGIN
    ALTER TABLE [dbo].[Microdisenos] ADD FechaEnvio DATETIME NULL;
    PRINT 'Columna FechaEnvio agregada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La columna FechaEnvio ya existía.';
END
GO

-- Agregar columna FechaAval a la tabla Microdisenos (fecha en que el aval aprueba el microdiseño)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Microdisenos]') AND name = 'FechaAval')
BEGIN
    ALTER TABLE [dbo].[Microdisenos] ADD FechaAval DATETIME NULL;
    PRINT 'Columna FechaAval agregada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La columna FechaAval ya existía.';
END
GO
