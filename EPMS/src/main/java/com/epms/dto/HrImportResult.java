package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
public class HrImportResult {
    private int created;
    private int updated;
    private int skipped;
    private List<String> warnings;
    private List<HrImportRowResult> rows;

    public HrImportResult() {
        this.warnings = new ArrayList<>();
        this.rows = new ArrayList<>();
    }
}