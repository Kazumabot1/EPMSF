package com.epms.controller;

import com.epms.dto.HrEmployeeAccountCreateRequest;
import com.epms.dto.HrImportResult;
import com.epms.dto.AccountProvisionResult;
import com.epms.service.HrEmployeeAccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/hr/employee-accounts")
@CrossOrigin(origins = "*")
public class HrEmployeeAccountController {

    private final HrEmployeeAccountService hrEmployeeAccountService;

    public HrEmployeeAccountController(HrEmployeeAccountService hrEmployeeAccountService) {
        this.hrEmployeeAccountService = hrEmployeeAccountService;
    }

    @PostMapping
    public ResponseEntity<AccountProvisionResult> createEmployeeAccount(
            @RequestBody HrEmployeeAccountCreateRequest request
    ) {
        return ResponseEntity.ok(
                hrEmployeeAccountService.createOrUpdateEmployeeAccount(request)
        );
    }

    @PostMapping("/import")
    public ResponseEntity<HrImportResult> importEmployeeAccounts(
            @RequestParam("file") MultipartFile file
    ) throws Exception {
        return ResponseEntity.ok(
                hrEmployeeAccountService.importEmployeeAccounts(file)
        );
    }

    @PostMapping("/{id}/resend-temporary-password")
    public ResponseEntity<AccountProvisionResult> resendTemporaryPassword(@PathVariable Integer id) {
        return ResponseEntity.ok(hrEmployeeAccountService.resendTemporaryPassword(id));
    }
}