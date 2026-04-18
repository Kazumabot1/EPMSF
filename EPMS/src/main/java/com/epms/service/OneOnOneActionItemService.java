package com.epms.service;

import com.epms.dto.OneOnOneActionItemRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;

import java.util.List;

public interface OneOnOneActionItemService {

    OneOnOneActionItemResponseDto createOneOnOneActionItem(OneOnOneActionItemRequestDto requestDto);

    List<OneOnOneActionItemResponseDto> getAllOneOnOneActionItems();

    OneOnOneActionItemResponseDto getOneOnOneActionItemById(Integer id);

    OneOnOneActionItemResponseDto updateOneOnOneActionItem(Integer id, OneOnOneActionItemRequestDto requestDto);

    void deleteOneOnOneActionItem(Integer id);
}
