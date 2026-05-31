package com.epms.repository;

import com.epms.entity.Department;
import com.epms.entity.DepartmentKpiTemplate;
import com.epms.entity.DepartmentKpiTemplateDepartment;
import com.epms.entity.DepartmentKpiTemplateRow;
import com.epms.entity.enums.KpiFormStatus;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class DepartmentKpiTemplateRepositoryTest {

    @Autowired
    private DepartmentKpiTemplateRepository repository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void listTemplatesFetchesRowsAndDepartmentsTogether() {
        Department finance = department("Finance", "FIN");
        Department operations = department("Operations", "OPS");
        entityManager.persist(finance);
        entityManager.persist(operations);

        DepartmentKpiTemplate template = new DepartmentKpiTemplate();
        template.setTitle("Department scorecard");
        template.setStatus(KpiFormStatus.ACTIVE);
        template.addRow(row("Delivery", 80.0, 60, 1));
        template.addRow(row("Quality", 95.0, 40, 2));
        template.addDepartment(link(finance));
        template.addDepartment(link(operations));
        repository.saveAndFlush(template);
        entityManager.clear();

        List<DepartmentKpiTemplate> templates = repository.findAllByOrderByCreatedAtDesc();

        assertThat(templates).hasSize(1);
        assertThat(templates.get(0).getRows())
                .extracting(DepartmentKpiTemplateRow::getId)
                .contains(1, 2);
        assertThat(templates.get(0).getDepartments()).hasSize(2);
    }

    private static Department department(String name, String code) {
        Department department = new Department();
        department.setDepartmentName(name);
        department.setDepartmentCode(code);
        return department;
    }

    private static DepartmentKpiTemplateRow row(String label, Double target, Integer weight, Integer sortOrder) {
        DepartmentKpiTemplateRow row = new DepartmentKpiTemplateRow();
        row.setKpiLabel(label);
        row.setTarget(target);
        row.setWeight(weight);
        row.setSortOrder(sortOrder);
        return row;
    }

    private static DepartmentKpiTemplateDepartment link(Department department) {
        DepartmentKpiTemplateDepartment link = new DepartmentKpiTemplateDepartment();
        link.setDepartment(department);
        return link;
    }
}
