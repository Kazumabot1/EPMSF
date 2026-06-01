package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
public class HrImportResult {
    private int totalRows;
    private int created;
    private int updated;
    private int skipped;
    private int failed;
    private String message;
    private List<String> warnings;
    private List<HrImportRowResult> rows;

    public HrImportResult() {
        this.totalRows = 0;
        this.created = 0;
        this.updated = 0;
        this.skipped = 0;
        this.failed = 0;
        this.message = "Import not started.";
        this.warnings = new ArrayList<>();
        this.rows = new ArrayList<>();
    }
}
