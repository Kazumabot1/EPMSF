package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HrImportRowResult {
    private int rowNumber;
    private String email;
    private String employeeAction;
    private String accountAction;
    private String emailAction;
    @Builder.Default
    private List<String> validationErrors = new ArrayList<>();
}
