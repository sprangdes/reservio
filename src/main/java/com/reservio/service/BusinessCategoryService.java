package com.reservio.service;

import com.reservio.config.CategoryProperties;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BusinessCategoryService {

    private final CategoryProperties categoryProperties;

    public BusinessCategoryService(CategoryProperties categoryProperties) {
        this.categoryProperties = categoryProperties;
    }

    public List<String> getCategories() {
        return categoryProperties.getCategories();
    }
}
