package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionResponseDto {

    private Integer id;
    private String positionTitle;
    private Integer levelId;
    private String levelCode;
    private String description;
    private Boolean status;
    private Date createdAt;
    private String createdBy;
}
