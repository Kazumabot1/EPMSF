package com.epms.controller;

import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;
import com.epms.service.OneOnOneMeetingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/one-on-one-meetings")
@RequiredArgsConstructor
public class OneOnOneMeetingController {

    private final OneOnOneMeetingService oneOnOneMeetingService;

    @PostMapping
    public ResponseEntity<OneOnOneMeetingResponseDto> createOneOnOneMeeting(
            @Valid @RequestBody OneOnOneMeetingRequestDto requestDto) {
        OneOnOneMeetingResponseDto responseDto = oneOnOneMeetingService.createOneOnOneMeeting(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<OneOnOneMeetingResponseDto>> getAllOneOnOneMeetings() {
        return ResponseEntity.ok(oneOnOneMeetingService.getAllOneOnOneMeetings());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OneOnOneMeetingResponseDto> getOneOnOneMeetingById(@PathVariable Integer id) {
        return ResponseEntity.ok(oneOnOneMeetingService.getOneOnOneMeetingById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OneOnOneMeetingResponseDto> updateOneOnOneMeeting(
            @PathVariable Integer id,
            @Valid @RequestBody OneOnOneMeetingRequestDto requestDto) {
        return ResponseEntity.ok(oneOnOneMeetingService.updateOneOnOneMeeting(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOneOnOneMeeting(@PathVariable Integer id) {
        oneOnOneMeetingService.deleteOneOnOneMeeting(id);
        return ResponseEntity.noContent().build();
    }
}
