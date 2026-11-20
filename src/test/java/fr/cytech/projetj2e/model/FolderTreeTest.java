package fr.cytech.projetj2e.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Règles de l'arborescence portées par Node / Folder / File (sans base de données). */
class FolderTreeTest {

    private Company company;
    private Department finance;
    private User owner;
    private Folder root;

    @BeforeEach
    void setUp() {
        company = new Company("CyTech", "CYTECH");
        finance = new Department("Finance", company);
        owner = new User();
        owner.setCompany(company);
        root = Folder.createRoot(owner, finance);
    }

    @Test
    void rootTakesDepartmentNameCompanyAndLevelZero() {
        assertTrue(root.isRoot());
        assertEquals("Finance", root.getName());
        assertSame(company, root.getCompany());
        assertSame(finance, root.getDepartment());
        assertEquals(0, root.getMinAccessLevel());
    }

    @Test
    void childInheritsCompanyDepartmentAndThreshold() {
        root.setMinAccessLevel(2);
        Folder reports = new Folder(owner, "Rapports", root);
        File budget = new File(owner, "budget.txt", reports, "budget.txt", "text/plain", "x/1", 10);

        assertSame(root, reports.getParent());
        assertSame(reports, budget.getParent());
        assertTrue(root.getChildren().contains(reports));
        assertTrue(reports.getChildren().contains(budget));
        assertSame(company, budget.getCompany());
        assertSame(finance, budget.getDepartment());
        assertEquals(2, budget.getMinAccessLevel());
    }

    @Test
    void childThresholdCannotBeLowerThanParent() {
        Folder reports = new Folder(owner, "Rapports", root);
        reports.setMinAccessLevel(3);
        Folder sub = new Folder(owner, "2026", reports);

        assertThrows(IllegalArgumentException.class, () -> sub.setMinAccessLevel(1));
        assertThrows(IllegalArgumentException.class, () -> sub.setMinAccessLevel(-1));
        sub.setMinAccessLevel(4);
        assertEquals(4, sub.getMinAccessLevel());
    }

    @Test
    void folderThresholdCannotExceedAChildThreshold() {
        Folder reports = new Folder(owner, "Rapports", root);
        new Folder(owner, "2026", reports);

        assertThrows(IllegalArgumentException.class, () -> reports.setMinAccessLevel(1));
        assertEquals(0, reports.getMinAccessLevel());
    }

    @Test
    void movingAFolderIntoItselfOrItsDescendantIsRefused() {
        Folder a = new Folder(owner, "A", root);
        Folder b = new Folder(owner, "B", a);

        assertThrows(IllegalArgumentException.class, () -> a.addChild(a));
        assertThrows(IllegalArgumentException.class, () -> b.addChild(a));
        assertSame(root, a.getParent());
    }

    @Test
    void movingIntoAFolderWithHigherThresholdIsRefused() {
        Folder secret = new Folder(owner, "Secret", root);
        secret.setMinAccessLevel(5);
        Folder open = new Folder(owner, "Public", root);

        assertThrows(IllegalArgumentException.class, () -> secret.addChild(open));
        assertSame(root, open.getParent());
    }

    @Test
    void movingDetachesFromOldParentAndUpdatesDepartmentOfSubtree() {
        Department hr = new Department("RH", company);
        Folder hrRoot = Folder.createRoot(owner, hr);
        Folder a = new Folder(owner, "A", root);
        File inA = new File(owner, "f.txt", a, "f.txt", "text/plain", "x/2", 1);

        hrRoot.addChild(a);

        assertFalse(root.getChildren().contains(a));
        assertTrue(hrRoot.getChildren().contains(a));
        assertSame(hrRoot, a.getParent());
        assertSame(hr, a.getDepartment());
        assertSame(hr, inA.getDepartment());
    }

    @Test
    void movingToAnotherCompanyIsRefused() {
        Company other = new Company("Autre", "AUTRE");
        User otherOwner = new User();
        otherOwner.setCompany(other);
        Folder otherRoot = Folder.createRoot(otherOwner, new Department("Finance", other));
        Folder a = new Folder(owner, "A", root);

        assertThrows(IllegalArgumentException.class, () -> otherRoot.addChild(a));
        assertSame(root, a.getParent());
    }

    @Test
    void removeChildDetachesWithoutDeleting() {
        Folder a = new Folder(owner, "A", root);

        root.removeChild(a);

        assertNull(a.getParent());
        assertFalse(root.getChildren().contains(a));
    }

    @Test
    void childrenListIsReadOnly() {
        assertThrows(UnsupportedOperationException.class, () -> root.getChildren().clear());
    }
}
