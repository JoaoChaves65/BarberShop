# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Admin Flows >> admin can create barber
- Location: e2e/admin.spec.ts:65:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Teste Barbeiro')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Teste Barbeiro') with timeout 5000ms
  - waiting for getByText('Teste Barbeiro')

```

```yaml
- banner:
  - link "BarberLab":
    - /url: /
  - navigation:
    - link "Dashboard":
      - /url: /
    - link "Agenda":
      - /url: /agenda
    - link "Clientes":
      - /url: /customers
    - link "Barbeiros":
      - /url: /barbers
    - link "Serviços":
      - /url: /services
    - link "Agendamentos":
      - /url: /appointments
    - link "Transações":
      - /url: /transactions
    - link "Usuários":
      - /url: /users
  - text: Admin User (ADMIN)
  - button "Sair"
- main:
  - heading "Barbeiros" [level=1]
  - button "Novo Barbeiro"
  - table:
    - rowgroup:
      - row "Nome Telefone Especialidade Data Admissão Status Ações":
        - columnheader "Nome"
        - columnheader "Telefone"
        - columnheader "Especialidade"
        - columnheader "Data Admissão"
        - columnheader "Status"
        - columnheader "Ações"
    - rowgroup:
      - row "João Barbeiro (11) 98888-1111 Corte clássico e barba 15/01/2022 Ativo Editar":
        - cell "João Barbeiro":
          - strong: João Barbeiro
        - cell "(11) 98888-1111"
        - cell "Corte clássico e barba"
        - cell "15/01/2022"
        - cell "Ativo"
        - cell "Editar":
          - button "Editar"
      - row "Maria Barbeira (11) 98888-2222 Corte feminino e coloração 01/03/2023 Ativo Editar":
        - cell "Maria Barbeira":
          - strong: Maria Barbeira
        - cell "(11) 98888-2222"
        - cell "Corte feminino e coloração"
        - cell "01/03/2023"
        - cell "Ativo"
        - cell "Editar":
          - button "Editar"
  - button "Anterior" [disabled]
  - text: Página 1 de 1 (2 total)
  - button "Próxima" [disabled]
  - heading "Novo Barbeiro" [level=2]
  - button "×"
  - text: Nome *
  - textbox "Nome *": Teste Barbeiro
  - text: Telefone *
  - textbox "Telefone *":
    - /placeholder: (11) 99999-9999
    - text: (11) 98888-7777
  - text: Especialidade *
  - textbox "Especialidade *":
    - /placeholder: "Ex: Corte clássico, Barba, etc."
    - text: Corte moderno
  - text: Data de Admissão *
  - textbox "Data de Admissão *": 2024-01-15
  - button "Cancelar"
  - button "Criar"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Admin Flows', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/login');
  6   |     await page.fill('input[type="email"]', 'admin@barberlab.local');
  7   |     await page.fill('input[type="password"]', 'dev123456');
  8   |     await page.click('button[type="submit"]');
  9   |     await expect(page).toHaveURL('/');
  10  |     await page.waitForTimeout(500);
  11  |   });
  12  | 
  13  |   test('admin can access all pages', async ({ page }) => {
  14  |     await page.click('a:has-text("Dashboard")');
  15  |     await expect(page).toHaveURL('/');
  16  | 
  17  |     await page.click('a:has-text("Clientes")');
  18  |     await expect(page).toHaveURL('/customers');
  19  | 
  20  |     await page.click('a:has-text("Barbeiros")');
  21  |     await expect(page).toHaveURL('/barbers');
  22  | 
  23  |     await page.click('a:has-text("Serviços")');
  24  |     await expect(page).toHaveURL('/services');
  25  | 
  26  |     await page.click('a:has-text("Agendamentos")');
  27  |     await expect(page).toHaveURL('/appointments');
  28  | 
  29  |     await page.click('a:has-text("Transações")');
  30  |     await expect(page).toHaveURL('/transactions');
  31  | 
  32  |     await page.click('a:has-text("Usuários")');
  33  |     await expect(page).toHaveURL('/users');
  34  |   });
  35  | 
  36  |   test('admin can access customers page', async ({ page }) => {
  37  |     await page.click('a:has-text("Clientes")');
  38  |     await expect(page).toHaveURL('/customers');
  39  |     await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  40  |     await expect(page.locator('table')).toBeVisible();
  41  |   });
  42  | 
  43  |   test('admin can create customer', async ({ page }) => {
  44  |     await page.click('a:has-text("Clientes")');
  45  |     await page.click('button:has-text("Novo Cliente")');
  46  |     await expect(page.getByRole('heading', { name: 'Novo Cliente' })).toBeVisible();
  47  | 
  48  |     await page.fill('input[name="name"]', 'Teste Cliente');
  49  |     await page.fill('input[name="phone"]', '(11) 99999-8888');
  50  |     await page.fill('input[name="email"]', 'teste@cliente.com');
  51  |     await page.fill('input[name="birthDate"]', '1990-01-01');
  52  |     await page.fill('textarea[name="notes"]', 'Cliente de teste');
  53  | 
  54  |     await page.click('button[type="submit"]:has-text("Criar")');
  55  |     await expect(page.getByText('Teste Cliente')).toBeVisible();
  56  |   });
  57  | 
  58  |   test('admin can access barbers page', async ({ page }) => {
  59  |     await page.click('a:has-text("Barbeiros")');
  60  |     await expect(page).toHaveURL('/barbers');
  61  |     await expect(page.getByRole('heading', { name: 'Barbeiros' })).toBeVisible();
  62  |     await expect(page.locator('table')).toBeVisible();
  63  |   });
  64  | 
  65  |   test('admin can create barber', async ({ page }) => {
  66  |     await page.click('a:has-text("Barbeiros")');
  67  |     await page.click('button:has-text("Novo Barbeiro")');
  68  |     await expect(page.getByRole('heading', { name: 'Novo Barbeiro' })).toBeVisible();
  69  | 
  70  |     await page.fill('input[name="name"]', 'Teste Barbeiro');
  71  |     await page.fill('input[name="phone"]', '(11) 98888-7777');
  72  |     await page.fill('input[name="specialty"]', 'Corte moderno');
  73  |     await page.fill('input[name="hireDate"]', '2024-01-15');
  74  | 
  75  |     await page.click('button[type="submit"]:has-text("Criar")');
> 76  |     await expect(page.getByText('Teste Barbeiro')).toBeVisible();
      |                                                    ^ Error: expect(locator).toBeVisible() failed
  77  |   });
  78  | 
  79  |   test('admin can access services page', async ({ page }) => {
  80  |     await page.click('a:has-text("Serviços")');
  81  |     await expect(page).toHaveURL('/services');
  82  |     await expect(page.getByRole('heading', { name: 'Serviços' })).toBeVisible();
  83  |     await expect(page.locator('table')).toBeVisible();
  84  |   });
  85  | 
  86  |   test('admin can create service', async ({ page }) => {
  87  |     await page.click('a:has-text("Serviços")');
  88  |     await page.click('button:has-text("Novo Serviço")');
  89  |     await expect(page.getByRole('heading', { name: 'Novo Serviço' })).toBeVisible();
  90  | 
  91  |     await page.fill('input[name="name"]', 'Teste Serviço');
  92  |     await page.fill('textarea[name="description"]', 'Descrição do teste');
  93  |     await page.fill('input[name="price"]', '50.00');
  94  |     await page.fill('input[name="durationMinutes"]', '30');
  95  | 
  96  |     await page.click('button[type="submit"]:has-text("Criar")');
  97  |     await expect(page.getByText('Teste Serviço')).toBeVisible();
  98  |   });
  99  | 
  100 |   test('admin can access appointments page', async ({ page }) => {
  101 |     await page.click('a:has-text("Agendamentos")');
  102 |     await expect(page).toHaveURL('/appointments');
  103 |     await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
  104 |     await expect(page.locator('table')).toBeVisible();
  105 |   });
  106 | 
  107 |   test('admin can access transactions page', async ({ page }) => {
  108 |     await page.click('a:has-text("Transações")');
  109 |     await expect(page).toHaveURL('/transactions');
  110 |     await expect(page.getByRole('heading', { name: 'Transações' })).toBeVisible();
  111 |     await expect(page.locator('table')).toBeVisible();
  112 |   });
  113 | 
  114 |   test('admin can access users page', async ({ page }) => {
  115 |     await page.click('a:has-text("Usuários")');
  116 |     await expect(page).toHaveURL('/users');
  117 |     await expect(page.getByRole('heading', { name: 'Usuários' })).toBeVisible();
  118 |     await expect(page.locator('table')).toBeVisible();
  119 |   });
  120 | });
  121 | 
```