package com.epms.dto;

import com.epms.entity.enums.KpiChangeType;
import com.epms.entity.enums.KpiVersionRowStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiVersionHistoryDetailDTO {

    private Integer templateId;
    private String templateTitle;
    private Integer versionNumber;
    private String versionTitle;
    private String positionName;
    private LocalDateTime createdAt;
    private LocalDateTime editedAt;
    private String editedBy;

    @Builder.Default
    private List<RowChangeDTO> changes = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowChangeDTO {
        private Integer historyId;
        private KpiChangeType changeType;
        private KpiVersionRowStatus rowStatus;
        private String reason;
        private LocalDateTime changedAt;
        private String changedBy;
        private Boolean initialVersion;
        private KpiVersionRowSnapshotDTO row;
    }
}
