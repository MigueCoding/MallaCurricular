using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using HtmlAgilityPack;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace MallaCurricular.Models
{
    public static class WordTemplateHelper
    {
        public static readonly string DefaultTemplateHtml = @"
        <!-- FORMATO FDE 058 HEADER -->
        <table class=""mb-5"">
            <tr>
                <td rowspan=""3"" class=""w-[20%] text-center"">
                    <img src=""LOGO ITM 2020-02.png"" alt=""ITM"" class=""h-14 mx-auto opacity-100"">
                </td>
                <td rowspan=""3"" class=""text-center font-bold text-sm"">MICRODISEÑO CURRICULAR</td>
                <td class=""bg-gray-50 font-bold w-16"">Código</td>
                <td class=""w-20"">FDE 058</td>
            </tr>
            <tr>
                <td class=""bg-gray-50 font-bold"">Versión</td>
                <td>05</td>
            </tr>
            <tr>
                <td class=""bg-gray-50 font-bold"">Fecha</td>
                <td>30-07-2024</td>
            </tr>
        </table>

        <span class=""section-num"">1. IDENTIFICACIÓN DE LA ASIGNATURA</span>

        <table class=""identification-table"">
            <!-- Fila de Nombre y Programa -->
            <tr>
                <td class=""bg-label"" colspan=""1"">Nombre de la Asignatura:</td>
                <td colspan=""3""><input type=""text"" id=""asig-nombre"" class=""input-doc font-bold"" readonly></td>
                <td class=""bg-label"" colspan=""1"">Programa (s):</td>
                <td colspan=""3""><input type=""text"" id=""txt-programas"" class=""input-doc doc-input""></td>
            </tr>
            <!-- Fila de Facultad -->
            <tr>
                <td class=""bg-label"" colspan=""1"">Facultad:</td>
                <td colspan=""7"">
                    <select id=""sel-facultad"" class=""input-doc doc-input"">
                        <option value="""">Seleccione Facultad.</option>
                        <option value=""Artes y Humanidades"">Artes y Humanidades</option>
                        <option value=""Ciencias Económicas y Administrativas"">Ciencias Económicas y Administrativas</option>
                        <option value=""Ciencias Exactas y Aplicadas"">Ciencias Exactas y Aplicadas</option>
                        <option value=""Ingenierías"">Ingenierías</option>
                    </select>
                </td>
            </tr>
            <!-- Fila de Modalidad -->
            <tr>
                <td class=""bg-label"" colspan=""1"">Modalidad del programa:</td>
                <td colspan=""7"">
                    <select id=""sel-modalidad"" class=""input-doc doc-input"">
                        <option value="""">Seleccione Modalidad.</option>
                        <option value=""Presencial"">Presencial</option>
                        <option value=""Virtual"">Virtual</option>
                        <option value=""A distancia"">A distancia</option>
                        <option value=""Híbrida"">Híbrida</option>
                        <option value=""Dual"">Dual</option>
                    </select>
                </td>
            </tr>
            <!-- Fila de Área -->
            <tr>
                <td class=""bg-label"" colspan=""1"">Área de formación:</td>
                <td colspan=""7""><input type=""text"" id=""txt-area"" class=""input-doc doc-input""></td>
            </tr>
            <!-- Fila de Código y Plan -->
            <tr>
                <td class=""bg-label"" colspan=""1"">Código de asignatura:</td>
                <td colspan=""3""><input type=""text"" id=""asig-codigo"" class=""input-doc bg-gray-50"" readonly></td>
                <td class=""bg-label"" colspan=""1"">Plan de estudios <span class=""text-[8px] font-normal"">(solo específicas)</span>:</td>
                <td colspan=""3""><input type=""text"" id=""txt-plandeestudios"" class=""input-doc doc-input""></td>
            </tr>
            <!-- Fila de Correquisitos y Prerrequisitos -->
            <tr>
                <td class=""bg-label"" colspan=""1"">Correquisitos:</td>
                <td colspan=""3""><input type=""text"" id=""txt-correq"" class=""input-doc doc-input""></td>
                <td class=""bg-label"" colspan=""1"">Prerrequisitos:</td>
                <td colspan=""3""><input type=""text"" id=""txt-prereq"" class=""input-doc doc-input""></td>
            </tr>
            <!-- Fila de Créditos y Tipo de Crédito -->
            <tr>
                <td class=""bg-label"" colspan=""1"">Créditos de la asignatura</td>
                <td colspan=""1""><input type=""number"" id=""num-creditos"" class=""input-doc text-center doc-input""></td>
                <td class=""bg-label"" colspan=""2"" class=""text-center"">Tipo de crédito:</td>
                <td colspan=""4"">
                    <select id=""sel-tipocredito"" class=""input-doc doc-input"">
                        <option value=""Obligatorio"">Obligatorio</option>
                        <option value=""electivo"">electivo</option>
                        <option value=""optativo"">optativo</option>
                        <option value=""libre elección"">libre elección</option>
                        <option value=""Propedeutico"">Propedeutico</option>
                    </select>
                </td>
            </tr>
            <!-- Fila de Tipo de Asignatura -->
            <tr>
                <td class=""bg-label"" colspan=""1"">Tipo de asignatura:</td>
                <td colspan=""7"">
                    <select id=""sel-tipoasignatura"" class=""input-doc doc-input"">
                        <option value="""">Elija un elemento.</option>
                        <option value=""Teórica"">Teórica</option>
                        <option value=""Práctica"">Práctica</option>
                        <option value=""Teórico-práctica"">Teórico-práctica</option>
                    </select>
                </td>
            </tr>
            <!-- Fila de Distribución de Horas (8 columnas) -->
            <tr>
                <td class=""bg-label text-center"">Horas teóricas:</td>
                <td class=""text-center font-bold""><input type=""number"" id=""num-hteoricas"" class=""input-doc text-center doc-input""></td>
                <td class=""bg-label text-center"">Horas teórico – prácticas:</td>
                <td class=""text-center font-bold""><input type=""number"" id=""num-hteoprac"" class=""input-doc text-center doc-input""></td>
                <td class=""bg-label text-center"">Horas prácticas:</td>
                <td class=""text-center font-bold""><input type=""number"" id=""num-hprac"" class=""input-doc text-center doc-input""></td>
                <td class=""bg-label text-center"">Horas trabajo independiente:</td>
                <td class=""text-center font-bold""><input type=""number"" id=""num-hindep"" class=""input-doc text-center doc-input""></td>
            </tr>
            <!-- Fila de Modalidad de Horas -->
            <tr>
                <td class=""bg-label text-center"">Horas presenciales</td>
                <td class=""text-center font-bold""><input type=""number"" id=""num-hpres"" class=""input-doc text-center doc-input""></td>
                <td class=""bg-label text-center"">Horas encuentros físicos</td>
                <td class=""text-center font-bold""><input type=""number"" id=""num-hfisicos"" class=""input-doc text-center doc-input""></td>
                <td class=""bg-label text-center"">Horas sesiones sincrónicas</td>
                <td colspan=""3"" class=""text-center font-bold""><input type=""number"" id=""num-hsinc"" class=""input-doc text-center doc-input""></td>
            </tr>
        </table>

        <div class=""orientacion-box"">
            <strong>1. Orientaciones sobre cómo desarrollar la identificación de la asignatura:</strong><br>
            La identificación permite comprender su contexto. Una modalidad como la virtual implica diferencias en
            planificación...
            Asignaturas transversales se dejan en blanco los datos del programa. Los créditos deben corresponder al
            total de horas.
        </div>

        <span class=""section-num uppercase"">2. Justificación</span>
        <div class=""border border-black p-1"">
            <textarea id=""txt-justificacion"" class=""input-doc doc-input min-h-[60px]""
                      placeholder=""Escriba aquí...""></textarea>
        </div>

        <div class=""orientacion-box"">
            <strong>2) Orientaciones sobre cómo escribir la justificación:</strong> Debe desarrollar la pertinencia...
            ¿Qué problema o situación del contexto intenta abordar o resolver?
        </div>

        <span class=""section-num uppercase"">3. COMPETENCIA(S) Y RESULTADOS DE APRENDIZAJE</span>
        <table>
            <tr class=""bg-label text-center uppercase"">
                <td class=""w-1/2"">Competencia del programa a la que aporta la asignatura</td>
                <td>Resultado (s) de aprendizaje del programa asociados a la competencia</td>
            </tr>
            <tr>
                <td class=""p-0"">
                    <textarea id=""txt-competencias"" class=""input-doc doc-input min-h-[70px]""
                              placeholder=""Escriba la competencia...""></textarea>
                </td>
                <td class=""p-0"">
                    <textarea id=""txt-resultados-aprendizaje"" class=""input-doc doc-input min-h-[70px]""
                              placeholder=""- Escriba el resultado...""></textarea>
                </td>
            </tr>
        </table>

        <div class=""orientacion-box"">
            <strong>4) Orientaciones sobre las competencias:</strong> Deben ser las definidas en el programa de
            formación, NO definiremos aquí competencias de asignatura.
        </div>

        <span class=""section-num uppercase"">4. SABERES</span>
        <table>
            <tr class=""bg-label text-center uppercase"">
                <td class=""w-[30%]"">Saberes</td>
                <td>Criterios de desempeño / Resultados esperados</td>
                <td>Evidencias</td>
            </tr>
            <tr>
                <td class=""bg-gray-50 font-bold p-1"">
                    DECLARATIVOS: <br><span class=""font-normal text-[8px] italic"">Escriba aquí...</span>
                </td>
                <td class=""p-0""><textarea id=""txt-saber-dec-crit"" class=""input-doc doc-input h-full""></textarea></td>
                <td class=""p-0""><textarea id=""txt-saber-dec-evi"" class=""input-doc doc-input h-full""></textarea></td>
            </tr>
            <tr>
                <td class=""bg-gray-50 font-bold p-1"">
                    PROCEDIMENTALES: <br><span class=""font-normal text-[8px] italic"">Escriba aquí...</span>
                </td>
                <td class=""p-0""><textarea id=""txt-saber-pro-crit"" class=""input-doc doc-input h-full""></textarea></td>
                <td class=""p-0""><textarea id=""txt-saber-pro-evi"" class=""input-doc doc-input h-full""></textarea></td>
            </tr>
            <tr>
                <td class=""bg-gray-50 font-bold p-1"">
                    ACTITUDINALES: <br><span class=""font-normal text-[8px] italic"">Escriba aquí...</span>
                </td>
                <td class=""p-0""><textarea id=""txt-saber-act-crit"" class=""input-doc doc-input h-full""></textarea></td>
                <td class=""p-0""><textarea id=""txt-saber-act-evi"" class=""input-doc doc-input h-full""></textarea></td>
            </tr>
        </table>

        <span class=""section-num uppercase"">5. METODOLOGÍA, MATERIALES Y RECURSOS</span>
        <table>
            <tr>
                <td class=""bg-label uppercase"">Metodología</td>
            </tr>
            <tr>
                <td class=""bg-gray-100 font-bold text-[9px] uppercase"">Diagnóstico aprendizajes previos</td>
            </tr>
            <tr>
                <td class=""p-0"">
                    <textarea id=""txt-diagnostico"" class=""input-doc doc-input min-h-[40px]""
                              placeholder=""Escriba aquí...""></textarea>
                </td>
            </tr>
            <tr>
                <td class=""bg-gray-100 font-bold text-[9px] uppercase"">Metodología</td>
            </tr>
            <tr>
                <td class=""p-0"">
                    <textarea id=""txt-metodologia"" class=""input-doc doc-input min-h-[60px]""
                              placeholder=""Describa la metodología...""></textarea>
                </td>
            </tr>
            <tr>
                <td class=""bg-label uppercase"">Materiales y Recursos</td>
            </tr>
            <tr>
                <td class=""p-0"">
                    <textarea id=""txt-materiales"" class=""input-doc doc-input min-h-[40px]""
                              placeholder=""Describa aquí...""></textarea>
                </td>
            </tr>
            <tr>
                <td class=""bg-label uppercase text-[9px]"">Trabajo Independiente</td>
            </tr>
            <tr>
                <td class=""p-0"">
                    <textarea id=""txt-trabajoindep"" class=""input-doc doc-input min-h-[40px]""
                              placeholder=""Actividades de trabajo independiente...""></textarea>
                </td>
            </tr>
        </table>

        <span class=""section-num uppercase"">6. EVALUACIÓN (Se autogenerará durante edición)</span>
        <table>
            <tr class=""bg-label text-center uppercase"">
                <td class=""w-[40%]"">Evaluación</td>
                <td class=""w-[10%]"">%</td>
                <td>Estrategias e instrumentos para evaluar</td>
            </tr>
        </table>
        
        <span class=""section-num uppercase"">
            Bibliografía <span class=""text-[9px] font-normal italic"">
                (Básica,
                complementaria y referenciada)
            </span>
        </span>
        <div class=""border border-black p-1"">
            <textarea id=""txt-bibliografia"" class=""input-doc doc-input min-h-[60px]""
                      placeholder=""Apellido, A. A. (Año). Título...""></textarea>
        </div>

        <!-- CONTROL DE DOCUMENTO -->
        <table class=""mt-8"">
            <tr>
                <td class=""bg-gray-50 font-bold w-1/2"">Elaborado por:</td>
                <td class=""bg-gray-50 font-bold"">Revisado por:</td>
            </tr>
            <tr class=""h-12"">
                <td id=""txt-elaborado"" class=""italic align-bottom text-[9px]""></td>
                <td id=""txt-revisado"" class=""italic align-bottom text-[9px]""></td>
            </tr>
            <tr>
                <td class=""bg-gray-50 font-bold"">Aprobado por:</td>
                <td class=""bg-gray-100 px-2"">
                    <div class=""flex justify-between items-center text-[7px] font-bold"">
                        <div>VERSIÓN: <span id=""txt-version"">05</span></div>
                        <div>FECHA: <span id=""txt-fecha"">30-07-2024</span></div>
                    </div>
                </td>
            </tr>
            <tr class=""h-10 text-[9px]"">
                <td colspan=""2"" id=""txt-aprobado""></td>
            </tr>
        </table>";

        public static void ExportHtmlToDocx(string html, Stream outputStream)
        {
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            using (var wordDoc = WordprocessingDocument.Create(outputStream, WordprocessingDocumentType.Document))
            {
                var mainPart = wordDoc.AddMainDocumentPart();
                mainPart.Document = new Document();
                var body = new Body();
                mainPart.Document.Append(body);

                // Define default styles
                var docDefaults = new DocDefaults(
                    new RunPropertiesDefault(
                        new RunPropertiesBaseStyle(
                            new RunFonts() { Ascii = "Arial", HighAnsi = "Arial" },
                            new FontSize() { Val = "20" } // 10 pt
                        )
                    )
                );
                mainPart.Document.Append(docDefaults);

                // Process nodes
                var nodes = doc.DocumentNode.ChildNodes;
                foreach (var node in nodes)
                {
                    if (node.NodeType == HtmlNodeType.Comment) continue;

                    if (node.Name == "table")
                    {
                        var table = CreateWordTable(node);
                        body.Append(table);
                    }
                    else if (node.Name == "span" && node.HasClass("section-num"))
                    {
                        var p = CreateHeadingParagraph(node.InnerText.Trim(), true);
                        body.Append(p);
                    }
                    else if (node.Name == "div" && node.HasClass("orientacion-box"))
                    {
                        var p = CreateBoxParagraph(node.InnerText.Trim());
                        body.Append(p);
                    }
                    else if (node.Name == "div" || node.Name == "p")
                    {
                        // check if it contains a table or textarea
                        if (node.SelectSingleNode(".//table") != null)
                        {
                            var innerTable = node.SelectSingleNode(".//table");
                            var table = CreateWordTable(innerTable);
                            body.Append(table);
                        }
                        else if (node.SelectSingleNode(".//textarea") != null)
                        {
                            var textarea = node.SelectSingleNode(".//textarea");
                            var id = textarea.GetAttributeValue("id", "textarea");
                            
                            var table = new Table();
                            var tblProp = GetTableProperties();
                            table.AppendChild(tblProp);
                            var tr = new TableRow();
                            var td = new TableCell(new Paragraph(new Run(new Text($"[Texto: {id}]"))));
                            tr.Append(td);
                            table.Append(tr);
                            body.Append(table);
                        }
                        else
                        {
                            var txt = node.InnerText.Trim();
                            if (!string.IsNullOrEmpty(txt))
                            {
                                var p = CreateNormalParagraph(txt);
                                body.Append(p);
                            }
                        }
                    }
                }
                
                mainPart.Document.Save();
            }
        }

        private static Table CreateWordTable(HtmlNode htmlTableNode)
        {
            var wordTable = new Table();
            var tblProp = GetTableProperties();
            wordTable.AppendChild(tblProp);

            var rows = htmlTableNode.SelectNodes(".//tr");
            if (rows == null) return wordTable;

            foreach (var htmlRow in rows)
            {
                var wordRow = new TableRow();
                var cells = htmlRow.SelectNodes("./td | ./th");
                if (cells == null) continue;

                foreach (var htmlCell in cells)
                {
                    var wordCell = new TableCell();
                    
                    // Set cell properties
                    var tcp = new TableCellProperties();
                    
                    // Check shading (bg-label class)
                    if (htmlCell.HasClass("bg-label") || htmlCell.HasClass("bg-gray-50") || htmlCell.HasClass("bg-gray-100"))
                    {
                        tcp.Append(new Shading() { Val = ShadingPatternValues.Clear, Color = "auto", Fill = "F2F2F2" });
                    }

                    // Colspan
                    var colspanVal = htmlCell.GetAttributeValue("colspan", 1);
                    if (colspanVal > 1)
                    {
                        tcp.Append(new GridSpan() { Val = colspanVal });
                    }

                    // Rowspan
                    var rowspanVal = htmlCell.GetAttributeValue("rowspan", 1);
                    if (rowspanVal > 1)
                    {
                        tcp.Append(new VerticalMerge() { Val = MergedCellValues.Restart });
                    }
                    
                    wordCell.Append(tcp);

                    // Handle content inside td
                    var paragraph = new Paragraph();
                    var run = new Run();
                    
                    // Look for inputs, textareas, selects
                    var inputNode = htmlCell.SelectSingleNode(".//input");
                    var textareaNode = htmlCell.SelectSingleNode(".//textarea");
                    var selectNode = htmlCell.SelectSingleNode(".//select");

                    if (inputNode != null)
                    {
                        var type = inputNode.GetAttributeValue("type", "text");
                        var id = inputNode.GetAttributeValue("id", "input");
                        if (type == "number")
                        {
                            run.AppendChild(new Text($"[Numero: {id}]"));
                        }
                        else
                        {
                            run.AppendChild(new Text($"[Campo: {id}]"));
                        }
                    }
                    else if (textareaNode != null)
                    {
                        var id = textareaNode.GetAttributeValue("id", "textarea");
                        run.AppendChild(new Text($"[Texto: {id}]"));
                    }
                    else if (selectNode != null)
                    {
                        var id = selectNode.GetAttributeValue("id", "select");
                        var options = selectNode.SelectNodes(".//option");
                        var optList = new List<string>();
                        if (options != null)
                        {
                            foreach (var opt in options)
                            {
                                var val = opt.GetAttributeValue("value", "").Trim();
                                if (!string.IsNullOrEmpty(val)) optList.Add(val);
                            }
                        }
                        run.AppendChild(new Text($"[Lista: {id} | {string.Join("; ", optList)}]"));
                    }
                    else
                    {
                        // Just text
                        string cellText = htmlCell.InnerText.Trim();
                        cellText = HtmlEntity.DeEntitize(cellText);
                        run.AppendChild(new Text(cellText));
                    }

                    paragraph.Append(run);
                    wordCell.Append(paragraph);
                    wordRow.Append(wordCell);
                }

                wordTable.Append(wordRow);
            }

            return wordTable;
        }

        private static TableProperties GetTableProperties()
        {
            return new TableProperties(
                new TableBorders(
                    new TopBorder() { Val = BorderValues.Single, Size = 4, Color = "CCCCCC" },
                    new BottomBorder() { Val = BorderValues.Single, Size = 4, Color = "CCCCCC" },
                    new LeftBorder() { Val = BorderValues.Single, Size = 4, Color = "CCCCCC" },
                    new RightBorder() { Val = BorderValues.Single, Size = 4, Color = "CCCCCC" },
                    new InsideHorizontalBorder() { Val = BorderValues.Single, Size = 4, Color = "E0E0E0" },
                    new InsideVerticalBorder() { Val = BorderValues.Single, Size = 4, Color = "E0E0E0" }
                ),
                new TableWidth() { Type = TableWidthUnitValues.Pct, Width = "5000" } // 100% width
            );
        }

        private static Paragraph CreateHeadingParagraph(string text, bool isBold)
        {
            var p = new Paragraph();
            var pPr = new ParagraphProperties(
                new SpacingBetweenLines() { Before = "240", After = "120" }
            );
            p.Append(pPr);
            var run = new Run();
            var rPr = new RunProperties();
            if (isBold) rPr.Append(new Bold());
            rPr.Append(new FontSize() { Val = "24" }); // 12pt
            run.Append(rPr);
            run.Append(new Text(text));
            p.Append(run);
            return p;
        }

        private static Paragraph CreateBoxParagraph(string text)
        {
            var p = new Paragraph();
            var pPr = new ParagraphProperties(
                new SpacingBetweenLines() { Before = "120", After = "120" },
                new ParagraphBorders(new LeftBorder() { Val = BorderValues.Single, Size = 12, Color = "999999" })
            );
            p.Append(pPr);
            var run = new Run();
            var rPr = new RunProperties(new Italic());
            rPr.Append(new FontSize() { Val = "18" }); // 9pt
            run.Append(rPr);
            run.Append(new Text(text));
            p.Append(run);
            return p;
        }

        private static Paragraph CreateNormalParagraph(string text)
        {
            var p = new Paragraph();
            var run = new Run();
            run.Append(new Text(text));
            p.Append(run);
            return p;
        }

        public static string ImportDocxToHtml(Stream inputStream)
        {
            var sb = new StringBuilder();
            
            using (var wordDoc = WordprocessingDocument.Open(inputStream, false))
            {
                var body = wordDoc.MainDocumentPart.Document.Body;
                foreach (var element in body.ChildElements)
                {
                    if (element is Table wordTable)
                    {
                        // Check if it is the evaluation table
                        bool isEvalTable = false;
                        var firstRow = wordTable.Elements<TableRow>().FirstOrDefault();
                        if (firstRow != null)
                        {
                            var cellsText = firstRow.Elements<TableCell>().Select(c => c.InnerText.Trim().ToLower()).ToList();
                            if (cellsText.Any(t => t.Contains("evaluación") || t.Contains("evaluacion")) && cellsText.Any(t => t == "%"))
                            {
                                isEvalTable = true;
                            }
                        }

                        if (isEvalTable)
                        {
                            sb.AppendLine("<table>");
                            sb.AppendLine("  <tr class=\"bg-label text-center uppercase\">");
                            sb.AppendLine("    <td class=\"w-[40%]\">Evaluación</td>");
                            sb.AppendLine("    <td class=\"w-[10%]\">%</td>");
                            sb.AppendLine("    <td>Estrategias e instrumentos para evaluar</td>");
                            sb.AppendLine("  </tr>");
                            sb.AppendLine("  <tbody id=\"eval-body\"></tbody>");
                            sb.AppendLine("</table>");
                            sb.AppendLine("<button onclick=\"addEvalLine()\" class=\"no-print mt-2 bg-slate-700 text-white text-[9px] px-2 py-1 rounded doc-block hover:bg-slate-800 transition-colors\">+ Agregar Evento Evaluativo</button>");
                        }
                        else
                        {
                            sb.AppendLine("<table>");
                            foreach (var row in wordTable.Elements<TableRow>())
                            {
                                sb.AppendLine("  <tr>");
                                foreach (var cell in row.Elements<TableCell>())
                                {
                                    var tcp = cell.TableCellProperties;
                                    
                                    // Class/shading
                                    string shadingClass = "";
                                    var shading = tcp?.Shading;
                                    if (shading != null && shading.Fill != null && shading.Fill.Value != "auto" && shading.Fill.Value != "FFFFFF")
                                    {
                                        shadingClass = " class=\"bg-label\"";
                                    }
                                    
                                    // Colspan
                                    string colspanAttr = "";
                                    var gridSpan = tcp?.GridSpan;
                                    if (gridSpan != null && gridSpan.Val != null)
                                    {
                                        colspanAttr = $" colspan=\"{gridSpan.Val.Value}\"";
                                    }

                                    // Rowspan
                                    string rowspanAttr = "";
                                    var verticalMerge = tcp?.VerticalMerge;
                                    if (verticalMerge != null && verticalMerge.Val != null)
                                    {
                                        if (verticalMerge.Val.Value == MergedCellValues.Restart)
                                        {
                                            rowspanAttr = " rowspan=\"2\"";
                                        }
                                    }

                                    sb.Append($"    <td{shadingClass}{colspanAttr}{rowspanAttr}>");
                                    
                                    // Extract text of cell
                                    var textContent = string.Join("\n", cell.Elements<Paragraph>().Select(p => p.InnerText.Trim()));
                                    
                                    // Parse text content for placeholders
                                    var parsedHtml = ParsePlaceholders(textContent);
                                    sb.Append(parsedHtml);
                                    
                                    sb.AppendLine("</td>");
                                }
                                sb.AppendLine("  </tr>");
                            }
                            sb.AppendLine("</table>");
                        }
                    }
                    else if (element is Paragraph p)
                    {
                        var text = p.InnerText.Trim();
                        if (string.IsNullOrEmpty(text)) continue;

                        bool isSectionNum = false;
                        
                        var pPr = p.ParagraphProperties;
                        var rPr = p.Descendants<RunProperties>().FirstOrDefault();
                        if (rPr != null && rPr.Bold != null)
                        {
                            isSectionNum = true;
                        }
                        else if (Regex.IsMatch(text, @"^\d+\."))
                        {
                            isSectionNum = true;
                        }

                        bool isOrientacion = false;
                        if (pPr?.ParagraphBorders?.LeftBorder != null)
                        {
                            isOrientacion = true;
                        }
                        else if (text.ToLower().Contains("orientacion") || text.ToLower().Contains("orientación"))
                        {
                            isOrientacion = true;
                        }

                        if (isSectionNum)
                        {
                            sb.AppendLine($"<span class=\"section-num\">{text}</span>");
                        }
                        else if (isOrientacion)
                        {
                            sb.AppendLine($"<div class=\"orientacion-box\">{text}</div>");
                        }
                        else
                        {
                            sb.AppendLine($"<p>{text}</p>");
                        }
                    }
                }
            }
            
            return sb.ToString();
        }

        private static string ParsePlaceholders(string text)
        {
            if (string.IsNullOrEmpty(text)) return "";

            var matchCampo = Regex.Match(text, @"\[Campo:\s*([^\]]+)\]", RegexOptions.IgnoreCase);
            if (matchCampo.Success)
            {
                var id = matchCampo.Groups[1].Value.Trim();
                return $"<input type=\"text\" id=\"{id}\" class=\"input-doc doc-input\">";
            }

            var matchNumero = Regex.Match(text, @"\[Numero:\s*([^\]]+)\]", RegexOptions.IgnoreCase);
            if (matchNumero.Success)
            {
                var id = matchNumero.Groups[1].Value.Trim();
                return $"<input type=\"number\" id=\"{id}\" class=\"input-doc doc-input text-center\">";
            }

            var matchTexto = Regex.Match(text, @"\[Texto:\s*([^\]]+)\]", RegexOptions.IgnoreCase);
            if (matchTexto.Success)
            {
                var id = matchTexto.Groups[1].Value.Trim();
                return $"<textarea id=\"{id}\" class=\"input-doc doc-input min-h-[60px]\" placeholder=\"Escriba aquí...\"></textarea>";
            }

            var matchLista = Regex.Match(text, @"\[Lista:\s*([^|\]]+)\s*\|\s*([^\]]+)\]", RegexOptions.IgnoreCase);
            if (matchLista.Success)
            {
                var id = matchLista.Groups[1].Value.Trim();
                var optionsText = matchLista.Groups[2].Value.Trim();
                var options = optionsText.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries);

                var selectSb = new StringBuilder();
                selectSb.Append($"<select id=\"{id}\" class=\"input-doc doc-input\">");
                selectSb.Append("<option value=\"\">Seleccione...</option>");
                foreach (var opt in options)
                {
                    var cleanOpt = opt.Trim();
                    selectSb.Append($"<option value=\"{cleanOpt}\">{cleanOpt}</option>");
                }
                selectSb.Append("</select>");
                return selectSb.ToString();
            }

            return text;
        }
    }
}
