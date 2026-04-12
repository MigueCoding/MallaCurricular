
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
('MAT101', 'Matem�ticas B�sicas', NULL, 'course-green', 1, 3),
('GV101', 'Geometr�a Vectorial y Anal�tica', NULL, 'course-green', 1, 3),
('HC101', 'Habilidades Comunicativas', NULL, 'course-red', 1, 2),
('INF101', 'Introducci�n a la Inform�tica', NULL, 'course-red', 1, 3),
('FP101', 'Introducci�n a la Formaci�n Profesional', NULL, 'course-purple', 1, 2),
-- Nivel 2
('MIF102', 'Matem�ticas para la Inform�tica', NULL, 'course-green', 2, 3),
('LP102', 'L�gica de Programaci�n y Laboratorio', NULL, 'course-purple', 2, 5),
('MAT102', '�lgebra Lineal', 'Matem�ticas B�sicas', 'course-green', 2, 3),
('MAT103', 'C�lculo Diferencial', 'Matem�ticas B�sicas', 'course-green', 2, 3),
('ELI102', 'Electiva I', NULL, 'course-red', 2, 2),
-- Nivel 3
('FIM201', 'F�sica Mec�nica y Laboratorio', 'Matem�ticas B�sicas', 'course-green', 3, 5),
('MAT104', 'C�lculo Integral', 'C�lculo Diferencial', 'course-green', 3, 3),
('PRG202', 'Estructuras de Datos', 'L�gica de Programaci�n y Laboratorio', 'course-purple', 3, 5),
('FDB201', 'Fundamentos y Dise�o de Bases de Datos', NULL, 'course-purple', 3, 2),
('AM201', 'Fundamentaci�n Ambiental', NULL, 'course-red', 3, 2),
-- Nivel 4
('EST301', 'Estad�stica General', 'C�lculo Integral', 'course-green', 4, 3),
('PSW301', 'Programaci�n de Software', 'L�gica de Programaci�n y Laboratorio', 'course-purple', 4, 3),
('CTS301', 'Ciencia, Tecnolog�a y Sociedad � CTS', NULL, 'course-red', 4, 2),
('DAR301', 'Definici�n y An�lisis de Requisitos', NULL, 'course-purple', 4, 2),
('DBD301', 'Desarrollo de Bases de Datos', 'Fundamentos y Dise�o de Bases de Datos', 'course-purple', 4, 2),
('ING301', 'Ingl�s I', NULL, 'course-red', 4, 2),
-- Nivel 5
('ASW401', 'Aplicaciones y Servicios Web', 'Programaci�n de Software', 'course-purple', 5, 2),
('TG401', 'Trabajo de Grado � Tecnolog�a', NULL, 'course-purple', 5, 8),
('RED401', 'Redes LAN', NULL, 'course-purple', 5, 3),
('DSI401', 'Dise�o de Sistemas de Informaci�n', 'Definici�n y An�lisis de Requisitos', 'course-purple', 5, 3),
('ING402', 'Ingl�s II', 'Ingl�s I', 'course-red', 5, 2),
-- Nivel 6
('FEP501', 'Formulaci�n y Evaluaci�n de Proyectos', NULL, 'course-red', 6, 3),
('ASI501', 'Administraci�n de Sistemas de Informaci�n', NULL, 'course-green', 6, 3),
('PCS501', 'Pruebas y Calidad de Software', NULL, 'course-green', 6, 3),
('MDSI501', 'Metodolog�as de Desarrollo de SI', NULL, 'course-green', 6, 3),
('OPT501', 'Optativa I', NULL, 'course-green', 6, 2),
-- Nivel 7
('MN601', 'M�todos Num�ricos', NULL, 'course-green', 7, 3),
('AA601', 'An�lisis de Algoritmos', NULL, 'course-green', 7, 3),
('ADB601', 'Administraci�n de Bases de Datos', NULL, 'course-purple', 7, 3),
('AC601', 'Aprendizaje Computacional', NULL, 'course-purple', 7, 3),
('ING603', 'Ingl�s IV', NULL, 'course-red', 7, 2),
-- Nivel 8
('OPT701', 'Optimizaci�n', NULL, 'course-green', 8, 3),
('MIA701', 'Matem�ticas para la Inform�tica Avanzada', NULL, 'course-green', 8, 3),
('SI701', 'Seminario de Investigaci�n', NULL, 'course-green', 8, 2),
('PD701', 'Programaci�n Distribuida', NULL, 'course-purple', 8, 3),
('IN701', 'Inteligencia de Negocios', NULL, 'course-green', 8, 3),
('SO701', 'Sistemas Operativos', NULL, 'course-purple', 8, 2),
-- Nivel 9
('IO801', 'Investigaci�n de Operaciones', NULL, 'course-green', 9, 3),
('AC801', 'Arquitectura de Computadores', NULL, 'course-green', 9, 3),
('TG802', 'Trabajo de Grado � Ingenier�a', NULL, 'course-purple', 9, 8),
('AD801', 'An�lisis de Datos', NULL, 'course-green', 9, 3),
('OPT802', 'Optativa II', NULL, 'course-green', 9, 2),
-- Nivel 10
('MS901', 'Modelado y Simulaci�n', NULL, 'course-green', 10, 3),
('CP901', 'Compiladores', NULL, 'course-purple', 10, 3),
('GP901', 'Gesti�n de Proyectos', NULL, 'course-green', 10, 2),
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