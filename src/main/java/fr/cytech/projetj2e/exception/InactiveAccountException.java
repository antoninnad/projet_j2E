package fr.cytech.projetj2e.exception;

import fr.cytech.projetj2e.model.AccountStatus;

public class InactiveAccountException extends IllegalArgumentException {
    private final AccountStatus status;

    public InactiveAccountException(AccountStatus status) {
        super(status == AccountStatus.PENDING
                ? "Account is pending approval"
                : "Account is disabled");
        this.status = status;
    }

    public AccountStatus getStatus() {
        return status;
    }
}
