package com.epms.controller;

import com.epms.dto.OneOnOneActionItemRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;
import com.epms.service.OneOnOneActionItemService;
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
@RequestMapping("/api/one-on-one-action-items")
@RequiredArgsConstructor
public class OneOnOneActionItemController {

    private final OneOnOneActionItemService oneOnOneActionItemService;

    @PostMapping
    public ResponseEntity<OneOnOneActionItemResponseDto> createOneOnOneActionItem(
            @Valid @RequestBody OneOnOneActionItemRequestDto requestDto) {
        OneOnOneActionItemResponseDto responseDto = oneOnOneActionItemService.createOneOnOneActionItem(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<OneOnOneActionItemResponseDto>> getAllOneOnOneActionItems() {
        return ResponseEntity.ok(oneOnOneActionItemService.getAllOneOnOneActionItems());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OneOnOneActionItemResponseDto> getOneOnOneActionItemById(@PathVariable Integer id) {
        return ResponseEntity.ok(oneOnOneActionItemService.getOneOnOneActionItemById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OneOnOneActionItemResponseDto> updateOneOnOneActionItem(
            @PathVariable Integer id,
            @Valid @RequestBody OneOnOneActionItemRequestDto requestDto) {
        return ResponseEntity.ok(oneOnOneActionItemService.updateOneOnOneActionItem(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOneOnOneActionItem(@PathVariable Integer id) {
        oneOnOneActionItemService.deleteOneOnOneActionItem(id);
        return ResponseEntity.noContent().build();
    }
}
