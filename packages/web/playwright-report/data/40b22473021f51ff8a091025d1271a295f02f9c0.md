# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer.spec.ts >> Customer Flows >> customer can create appointment
- Location: e2e/customer.spec.ts:47:3

# Error details

```
Error: page.selectOption: options[0].label: expected string, got object
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "BarberLab" [ref=e6] [cursor=pointer]:
      - /url: /
    - navigation [ref=e7]:
      - link "Dashboard" [ref=e8] [cursor=pointer]:
        - /url: /
      - link "Agenda" [ref=e9] [cursor=pointer]:
        - /url: /agenda
      - link "Clientes" [ref=e10] [cursor=pointer]:
        - /url: /customers
      - link "Barbeiros" [ref=e11] [cursor=pointer]:
        - /url: /barbers
      - link "Serviços" [ref=e12] [cursor=pointer]:
        - /url: /services
      - link "Agendamentos" [ref=e13] [cursor=pointer]:
        - /url: /appointments
      - link "Transações" [ref=e14] [cursor=pointer]:
        - /url: /transactions
      - link "Usuários" [ref=e15] [cursor=pointer]:
        - /url: /users
    - generic [ref=e16]:
      - generic [ref=e17]: Carlos Cliente (CUSTOMER)
      - button "Sair" [ref=e18] [cursor=pointer]
  - main [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - heading "Agendamentos" [level=1] [ref=e22]
        - generic [ref=e23]:
          - combobox [ref=e24]:
            - option "Todos os status" [selected]
            - option "Pendente"
            - option "Confirmado"
            - option "Concluído"
            - option "Cancelado"
          - button "Carregando..." [disabled] [ref=e25] [cursor=pointer]
      - table [ref=e27]:
        - rowgroup [ref=e28]:
          - row [ref=e29]:
            - columnheader "Cliente" [ref=e30]
            - columnheader "Barbeiro" [ref=e31]
            - columnheader "Serviço" [ref=e32]
            - columnheader "Data/Hora" [ref=e33]
            - columnheader "Status" [ref=e34]
            - columnheader "Ações" [ref=e35]
        - rowgroup [ref=e36]:
          - row [ref=e37]:
            - cell "Cliente 2cff0a23" [ref=e38]
            - cell "Barbeiro c41097c2" [ref=e39]
            - cell "Serviço 4104e2fc" [ref=e40]
            - cell "12/09/2026, 21:08:28" [ref=e41]
            - cell "COMPLETED" [ref=e42]
            - cell [ref=e44]:
              - generic [ref=e45]:
                - button "Confirmar" [disabled] [ref=e46] [cursor=pointer]
                - button "Concluir" [disabled] [ref=e47] [cursor=pointer]
                - button "Cancelar" [disabled] [ref=e48] [cursor=pointer]
          - row [ref=e49]:
            - cell "Cliente 2cff0a23" [ref=e50]
            - cell "Barbeiro c41097c2" [ref=e51]
            - cell "Serviço 4f6d7993" [ref=e52]
            - cell "20/09/2026, 21:08:28" [ref=e53]
            - cell "PENDING" [ref=e54]
            - cell [ref=e56]:
              - generic [ref=e57]:
                - button "Confirmar" [ref=e58] [cursor=pointer]
                - button "Concluir" [disabled] [ref=e59] [cursor=pointer]
                - button "Cancelar" [ref=e60] [cursor=pointer]
      - generic [ref=e61]:
        - button "Anterior" [disabled] [ref=e62]
        - generic [ref=e63]: Página 1 de 1 (6 total)
        - button "Próxima" [disabled] [ref=e64]
      - generic [ref=e66]:
        - generic [ref=e67]:
          - heading "Novo Agendamento" [level=2] [ref=e68]
          - button "×" [disabled] [ref=e69] [cursor=pointer]
        - paragraph [ref=e73]: Carregando clientes, barbeiros e serviços...
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Customer Flows', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
  7  |     await page.fill('input[type="password"]', 'dev123456');
  8  |     await page.click('button[type="submit"]');
  9  |     await expect(page).toHaveURL('/');
  10 |     await page.waitForTimeout(500);
  11 |   });
  12 | 
  13 |   test('customer can access allowed pages', async ({ page }) => {
  14 |     await page.click('a:has-text("Agendamentos")');
  15 |     await expect(page).toHaveURL('/appointments');
  16 | 
  17 |     await page.click('a:has-text("Serviços")');
  18 |     await expect(page).toHaveURL('/services');
  19 | 
  20 |     await page.click('a:has-text("Barbeiros")');
  21 |     await expect(page).toHaveURL('/barbers');
  22 |   });
  23 | 
  24 |   test('customer cannot access admin pages', async ({ page }) => {
  25 |     await page.goto('/customers');
  26 |     await expect(page).toHaveURL('/');
  27 | 
  28 |     await page.goto('/transactions');
  29 |     await expect(page).toHaveURL('/');
  30 | 
  31 |     await page.goto('/users');
  32 |     await expect(page).toHaveURL('/');
  33 |   });
  34 | 
  35 |   test('customer can view services list', async ({ page }) => {
  36 |     await page.click('a:has-text("Serviços")');
  37 |     await expect(page.getByRole('heading', { name: 'Serviços' })).toBeVisible();
  38 |     await expect(page.locator('table')).toBeVisible();
  39 |   });
  40 | 
  41 |   test('customer can view barbers list', async ({ page }) => {
  42 |     await page.click('a:has-text("Barbeiros")');
  43 |     await expect(page.getByRole('heading', { name: 'Barbeiros' })).toBeVisible();
  44 |     await expect(page.locator('table')).toBeVisible();
  45 |   });
  46 | 
  47 |   test('customer can create appointment', async ({ page }) => {
  48 |     await page.click('a:has-text("Agendamentos")');
  49 |     await expect(page).toHaveURL('/appointments');
  50 | 
  51 |     await page.click('button:has-text("Novo Agendamento")');
  52 |     await expect(page.getByRole('heading', { name: 'Novo Agendamento' })).toBeVisible();
  53 | 
> 54 |     await page.selectOption('select[name="customerId"]', { label: /carlos\.cliente/ });
     |                ^ Error: page.selectOption: options[0].label: expected string, got object
  55 |     await page.selectOption('select[name="barberId"]', { label: /joao\.barbeiro/ });
  56 |     await page.selectOption('select[name="serviceId"]', { label: /Corte/ });
  57 | 
  58 |     const tomorrow = new Date();
  59 |     tomorrow.setDate(tomorrow.getDate() + 1);
  60 |     const dateStr = tomorrow.toISOString().slice(0, 16);
  61 |     await page.fill('input[name="dateTime"]', dateStr);
  62 | 
  63 |     await page.click('button[type="submit"]:has-text("Criar")');
  64 |     await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
  65 |   });
  66 | 
  67 |   test('customer can view own appointments', async ({ page }) => {
  68 |     await page.click('a:has-text("Agendamentos")');
  69 |     await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
  70 |     await expect(page.locator('table')).toBeVisible();
  71 |   });
  72 | });
  73 | 
```