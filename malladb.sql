
USE MallaDB;
GO

CREATE TABLE Cursos (
    Codigo VARCHAR(10) PRIMARY KEY,
    Asignatura NVARCHAR(100) UNIQUE,
    Prerequisito NVARCHAR(100),
    Color VARCHAR(50),
    Semestre INT,
    Creditos INT,
	FOREIGN KEY (Prerequisito) REFERENCES Cursos(Asignatura)
);
GO

INSERT INTO Cursos (Codigo, Asignatura, Prerequisito, Color, Semestre, Creditos) VALUES
('MAT101', 'Matemáticas Básicas', NULL, 'course-green', 1, 3),
('GV101', 'Geometría Vectorial y Analítica', NULL, 'course-green', 1, 3),
('HC101', 'Habilidades Comunicativas', NULL, 'course-red', 1, 2),
('INF101', 'Introducción a la Informática', NULL, 'course-red', 1, 3),
('FP101', 'Introducción a la Formación Profesional', NULL, 'course-purple', 1, 2),
-- Nivel 2
('MIF102', 'Matemáticas para la Informática', NULL, 'course-green', 2, 3),
('LP102', 'Lógica de Programación y Laboratorio', NULL, 'course-purple', 2, 5),
('MAT102', 'Álgebra Lineal', 'Matemáticas Básicas', 'course-green', 2, 3),
('MAT103', 'Cálculo Diferencial', 'Matemáticas Básicas', 'course-green', 2, 3),
('ELI102', 'Electiva I', NULL, 'course-red', 2, 2),
-- Nivel 3
('FIM201', 'Física Mecánica y Laboratorio', 'Matemáticas Básicas', 'course-green', 3, 5),
('MAT104', 'Cálculo Integral', 'Cálculo Diferencial', 'course-green', 3, 3),
('PRG202', 'Estructuras de Datos', 'Lógica de Programación y Laboratorio', 'course-purple', 3, 5),
('FDB201', 'Fundamentos y Diseño de Bases de Datos', NULL, 'course-purple', 3, 2),
('AM201', 'Fundamentación Ambiental', NULL, 'course-red', 3, 2),
-- Nivel 4
('EST301', 'Estadística General', 'Cálculo Integral', 'course-green', 4, 3),
('PSW301', 'Programación de Software', 'Lógica de Programación y Laboratorio', 'course-purple', 4, 3),
('CTS301', 'Ciencia, Tecnología y Sociedad – CTS', NULL, 'course-red', 4, 2),
('DAR301', 'Definición y Análisis de Requisitos', NULL, 'course-purple', 4, 2),
('DBD301', 'Desarrollo de Bases de Datos', 'Fundamentos y Diseño de Bases de Datos', 'course-purple', 4, 2),
('ING301', 'Inglés I', NULL, 'course-red', 4, 2),
-- Nivel 5
('ASW401', 'Aplicaciones y Servicios Web', 'Programación de Software', 'course-purple', 5, 2),
('TG401', 'Trabajo de Grado – Tecnología', NULL, 'course-purple', 5, 8),
('RED401', 'Redes LAN', NULL, 'course-purple', 5, 3),
('DSI401', 'Diseño de Sistemas de Información', 'Definición y Análisis de Requisitos', 'course-purple', 5, 3),
('ING402', 'Inglés II', 'Inglés I', 'course-red', 5, 2),
-- Nivel 6
('FEP501', 'Formulación y Evaluación de Proyectos', NULL, 'course-red', 6, 3),
('ASI501', 'Administración de Sistemas de Información', NULL, 'course-green', 6, 3),
('PCS501', 'Pruebas y Calidad de Software', NULL, 'course-green', 6, 3),
('MDSI501', 'Metodologías de Desarrollo de SI', NULL, 'course-green', 6, 3),
('OPT501', 'Optativa I', NULL, 'course-green', 6, 2),
-- Nivel 7
('MN601', 'Métodos Numéricos', NULL, 'course-green', 7, 3),
('AA601', 'Análisis de Algoritmos', NULL, 'course-green', 7, 3),
('ADB601', 'Administración de Bases de Datos', NULL, 'course-purple', 7, 3),
('AC601', 'Aprendizaje Computacional', NULL, 'course-purple', 7, 3),
('ING603', 'Inglés IV', NULL, 'course-red', 7, 2),
-- Nivel 8
('OPT701', 'Optimización', NULL, 'course-green', 8, 3),
('MIA701', 'Matemáticas para la Informática Avanzada', NULL, 'course-green', 8, 3),
('SI701', 'Seminario de Investigación', NULL, 'course-green', 8, 2),
('PD701', 'Programación Distribuida', NULL, 'course-purple', 8, 3),
('IN701', 'Inteligencia de Negocios', NULL, 'course-green', 8, 3),
('SO701', 'Sistemas Operativos', NULL, 'course-purple', 8, 2),
-- Nivel 9
('IO801', 'Investigación de Operaciones', NULL, 'course-green', 9, 3),
('AC801', 'Arquitectura de Computadores', NULL, 'course-green', 9, 3),
('TG802', 'Trabajo de Grado – Ingeniería', NULL, 'course-purple', 9, 8),
('AD801', 'Análisis de Datos', NULL, 'course-green', 9, 3),
('OPT802', 'Optativa II', NULL, 'course-green', 9, 2),
-- Nivel 10
('MS901', 'Modelado y Simulación', NULL, 'course-green', 10, 3),
('CP901', 'Compiladores', NULL, 'course-purple', 10, 3),
('GP901', 'Gestión de Proyectos', NULL, 'course-green', 10, 2),
('AS901', 'Arquitecturas de Software', NULL, 'course-green', 10, 3);
GO

CREATE TABLE Mallas (
    Id INT PRIMARY KEY IDENTITY(1,1),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    Nombre NVARCHAR(100) NULL -- Opcional, para identificar la malla
);
GO


select * from mallas
delete from Malla
select * from MallaCursos

SELECT * FROM MallaCursos where Mallaid=7


-- Crear tabla MallaCursos
CREATE TABLE MallaCursos (
    MallaId INT,
    CursoCodigo VARCHAR(10),
    Semestre INT NOT NULL CHECK (Semestre BETWEEN 1 AND 10),
    PRIMARY KEY (MallaId, CursoCodigo),
    FOREIGN KEY (MallaId) REFERENCES Mallas(Id) ON DELETE CASCADE,
    FOREIGN KEY (CursoCodigo) REFERENCES Cursos(Codigo) ON DELETE CASCADE
);
GO

SELECT Semestre, Codigo, Asignatura, Prerequisito, Color, Creditos
FROM Cursos
ORDER BY Semestre ASC;
GO

INSERT INTO [dbo].[Usuarios] (Nombre, Correo, Clave, Rol)
VALUES ('Miguel Casseres', 'miguel@example.com', '123456', 'Admin');