package br.lunavita.totemapi.service;

import br.lunavita.totemapi.model.Appointment;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class ReportService {

    private final FileStorageService storage;

    @Value("${clinic.name:Totem Lunavita}")
    private String clinicName;

    @Value("${clinic.address:Rua das Flores, 123 - Fortaleza - CE}")
    private String clinicAddress;

    @Value("${clinic.phone:(85) 4002-8922}")
    private String clinicPhone;

    public ReportService(FileStorageService storage) {
        this.storage = storage;
    }

    public byte[] generateAppointmentReport(Appointment apt) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document doc = new Document(PageSize.A4, 36, 36, 48, 36);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font h1 = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font h2 = new Font(Font.HELVETICA, 12, Font.BOLD);
            Font p = new Font(Font.HELVETICA, 11, Font.NORMAL);

            Paragraph title = new Paragraph("Relatório de Atendimento", h1);
            title.setAlignment(Element.ALIGN_CENTER);
            doc.add(title);
            doc.add(Chunk.NEWLINE);

            Paragraph clinic = new Paragraph(clinicName + "\n" + clinicAddress + "\n" + clinicPhone, p);
            clinic.setAlignment(Element.ALIGN_CENTER);
            doc.add(clinic);
            doc.add(Chunk.NEWLINE);

            doc.add(new Paragraph("Dados da Consulta", h2));
            doc.add(new Paragraph("Paciente: " + apt.getPatient(), p));
            doc.add(new Paragraph("CPF: " + (apt.getCpf() == null ? "-" : apt.getCpf()), p));
            doc.add(new Paragraph("E-mail: " + (apt.getPatientEmail() == null ? "-" : apt.getPatientEmail()), p));
            doc.add(new Paragraph("Profissional: " + apt.getDoctor(), p));
            doc.add(new Paragraph("Especialidade: " + apt.getSpecialty(), p));
            doc.add(new Paragraph("Tipo: " + apt.getType(), p));
            doc.add(new Paragraph("Data/Hora: " + apt.getDate() + " " + apt.getTime(), p));
            doc.add(new Paragraph("Valor: R$ " + apt.getAmount(), p));
            doc.add(new Paragraph("Status: " + apt.getStatus() + (apt.isPaid() ? " (Pagamento confirmado)" : ""), p));
            doc.add(Chunk.NEWLINE);

            if (apt.getPhotoUrl() != null && !apt.getPhotoUrl().isBlank()) {
                try {
                    Path path = storage.resolveFromUrl(apt.getPhotoUrl());
                    if (Files.exists(path)) {
                        Image img = Image.getInstance(path.toAbsolutePath().toString());
                        img.scaleToFit(400, 400);
                        img.setAlignment(Image.MIDDLE);
                        doc.add(new Paragraph("Foto Anexada:", h2));
                        doc.add(Chunk.NEWLINE);
                        doc.add(img);
                        doc.add(Chunk.NEWLINE);
                    }
                } catch (Exception e) {
                    doc.add(new Paragraph("(Não foi possível carregar a foto anexada)", p));
                    doc.add(Chunk.NEWLINE);
                }
            }

            doc.add(new Paragraph("Observações:", h2));
            doc.add(new Paragraph(
                    "- Comparecer com 10 minutos de antecedência.\n- Em caso de dúvidas, contate: " + clinicPhone, p));

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build report: " + e.getMessage(), e);
        }
    }
}
