# ACs

**GIVEN** the checkout page has a promotion area in the order summary:

![Initial checkout page with promotion area](./images/checkout-initial-state.png)

- **WHEN** a user enters a valid promotion code and hits `Apply`, **THEN**
  - A spinner will be shown while the promotion is validated.
  - The apply button will be disabled.
  - The promotion code input will be disabled. 
    
    ![Checkout page during promotion validation](./images/checkout-validation-state.png)

  - **WHEN** the promotion has been validated, **THEN**
    - the promotion name will be shown
    - the amount of the promotion will be shown
    - the total price will be updated
    - "Apply a promotion" will be changed to "Applied promotion"

      ![Checkout page with applied promotion](./images/checkout-applied-promotion.png)

  - **WHEN** the promotion is invalid, **THEN** provide an error message:

    ![Checkout page with invalid promotion error](./images/checkout-invalid-promotion.png)