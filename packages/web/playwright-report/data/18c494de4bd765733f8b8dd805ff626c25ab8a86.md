# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-states.spec.ts >> UI States - Barbers >> loading state shows spinner
- Location: e2e/ui-states.spec.ts:67:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Carregando...')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Carregando...') with timeout 5000ms
  - waiting for getByText('Carregando...')

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
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('UI States - Customers', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/login');
  6   |     await page.fill('input[type="email"]', 'admin@barberlab.local');
  7   |     await page.fill('input[type="password"]', 'dev123456');
  8   |     await page.click('button[type="submit"]');
  9   |     await expect(page).toHaveURL('/');
  10  |     await page.waitForTimeout(500);
  11  |   });
  12  | 
  13  |   test('loading state shows spinner', async ({ page }) => {
  14  |     await page.goto('/customers');
  15  |     await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 5000 });
  16  |   });
  17  | 
  18  |   test('empty state handled', async ({ page }) => {
  19  |     await page.goto('/customers');
  20  |     await expect(page.locator('table')).toBeVisible();
  21  |   });
  22  | 
  23  |   test('form validation shows errors', async ({ page }) => {
  24  |     await page.goto('/customers');
  25  |     await page.click('button:has-text("Novo Cliente")');
  26  |     await page.click('button[type="submit"]:has-text("Criar")');
  27  |     await expect(page.getByText('Nome *')).toBeVisible();
  28  |     await expect(page.getByText('Telefone *')).toBeVisible();
  29  |   });
  30  | 
  31  |   test('modal opens and closes correctly', async ({ page }) => {
  32  |     await page.goto('/customers');
  33  |     await page.click('button:has-text("Novo Cliente")');
  34  |     await expect(page.getByRole('heading', { name: 'Novo Cliente' })).toBeVisible();
  35  |     await page.click('button:has-text("Cancelar")');
  36  |     await expect(page.getByRole('heading', { name: 'Novo Cliente' })).not.toBeVisible();
  37  |   });
  38  | 
  39  |   test('list updates after creation', async ({ page }) => {
  40  |     await page.goto('/customers');
  41  |     const initialCount = await page.locator('tbody tr').count();
  42  | 
  43  |     await page.click('button:has-text("Novo Cliente")');
  44  |     await page.fill('input[name="name"]', 'UI Test Client');
  45  |     await page.fill('input[name="phone"]', '(11) 99999-7777');
  46  |     await page.fill('input[name="email"]', 'ui.test@client.com');
  47  |     await page.fill('input[name="birthDate"]', '1990-01-01');
  48  |     await page.fill('textarea[name="notes"]', 'UI test client');
  49  |     await page.click('button[type="submit"]:has-text("Criar")');
  50  | 
  51  |     await expect(page.getByText('UI Test Client')).toBeVisible();
  52  |     const newCount = await page.locator('tbody tr').count();
  53  |     expect(newCount).toBeGreaterThanOrEqual(initialCount);
  54  |   });
  55  | });
  56  | 
  57  | test.describe('UI States - Barbers', () => {
  58  |   test.beforeEach(async ({ page }) => {
  59  |     await page.goto('/login');
  60  |     await page.fill('input[type="email"]', 'admin@barberlab.local');
  61  |     await page.fill('input[type="password"]', 'dev123456');
  62  |     await page.click('button[type="submit"]');
  63  |     await expect(page).toHaveURL('/');
  64  |     await page.waitForTimeout(500);
  65  |   });
  66  | 
  67  |   test('loading state shows spinner', async ({ page }) => {
  68  |     await page.goto('/barbers');
> 69  |     await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 5000 });
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  70  |   });
  71  | 
  72  |   test('form validation works', async ({ page }) => {
  73  |     await page.goto('/barbers');
  74  |     await page.click('button:has-text("Novo Barbeiro")');
  75  |     await page.click('button[type="submit"]:has-text("Criar")');
  76  |     await expect(page.getByText('Nome *')).toBeVisible();
  77  |     await expect(page.getByText('Telefone *')).toBeVisible();
  78  |     await expect(page.getByText('Especialidade *')).toBeVisible();
  79  |     await expect(page.getByText('Data de Admissão *')).toBeVisible();
  80  |   });
  81  | 
  82  |   test('modal works correctly', async ({ page }) => {
  83  |     await page.goto('/barbers');
  84  |     await page.click('button:has-text("Novo Barbeiro")');
  85  |     await expect(page.getByRole('heading', { name: 'Novo Barbeiro' })).toBeVisible();
  86  |     await page.click('button:has-text("Cancelar")');
  87  |     await expect(page.getByRole('heading', { name: 'Novo Barbeiro' })).not.toBeVisible();
  88  |   });
  89  | });
  90  | 
  91  | test.describe('UI States - Services', () => {
  92  |   test.beforeEach(async ({ page }) => {
  93  |     await page.goto('/login');
  94  |     await page.fill('input[type="email"]', 'admin@barberlab.local');
  95  |     await page.fill('input[type="password"]', 'dev123456');
  96  |     await page.click('button[type="submit"]');
  97  |     await expect(page).toHaveURL('/');
  98  |     await page.waitForTimeout(500);
  99  |   });
  100 | 
  101 |   test('loading state shows spinner', async ({ page }) => {
  102 |     await page.goto('/services');
  103 |     await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 5000 });
  104 |   });
  105 | 
  106 |   test('form validation works', async ({ page }) => {
  107 |     await page.goto('/services');
  108 |     await page.click('button:has-text("Novo Serviço")');
  109 |     await page.click('button[type="submit"]:has-text("Criar")');
  110 |     await expect(page.getByText('Nome *')).toBeVisible();
  111 |     await expect(page.getByText('Preço *')).toBeVisible();
  112 |     await expect(page.getByText('Duração (minutos) *')).toBeVisible();
  113 |   });
  114 | });
  115 | 
  116 | test.describe('UI States - Appointments', () => {
  117 |   test.beforeEach(async ({ page }) => {
  118 |     await page.goto('/login');
  119 |     await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
  120 |     await page.fill('input[type="password"]', 'dev123456');
  121 |     await page.click('button[type="submit"]');
  122 |     await expect(page).toHaveURL('/');
  123 |     await page.waitForTimeout(500);
  124 |   });
  125 | 
  126 |   test('loading state shows spinner', async ({ page }) => {
  127 |     await page.goto('/appointments');
  128 |     await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 5000 });
  129 |   });
  130 | 
  131 |   test('status filter works', async ({ page }) => {
  132 |     await page.goto('/appointments');
  133 |     await expect(page.locator('select')).toBeVisible();
  134 |     await page.selectOption('select', 'PENDING');
  135 |     await expect(page.locator('select')).toHaveValue('PENDING');
  136 |   });
  137 | 
  138 |   test('modal opens and loads data', async ({ page }) => {
  139 |     await page.goto('/appointments');
  140 |     await page.click('button:has-text("Novo Agendamento")');
  141 |     await expect(page.getByText('Carregando clientes, barbeiros e serviços...')).toBeVisible();
  142 |     await expect(page.locator('select[name="customerId"]')).toBeVisible({ timeout: 5000 });
  143 |   });
  144 | });
  145 | 
  146 | test.describe('UI States - Transactions', () => {
  147 |   test.beforeEach(async ({ page }) => {
  148 |     await page.goto('/login');
  149 |     await page.fill('input[type="email"]', 'admin@barberlab.local');
  150 |     await page.fill('input[type="password"]', 'dev123456');
  151 |     await page.click('button[type="submit"]');
  152 |     await expect(page).toHaveURL('/');
  153 |     await page.waitForTimeout(500);
  154 |   });
  155 | 
  156 |   test('loading state shows spinner', async ({ page }) => {
  157 |     await page.goto('/transactions');
  158 |     await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 5000 });
  159 |   });
  160 | 
  161 |   test('type filter works', async ({ page }) => {
  162 |     await page.goto('/transactions');
  163 |     await expect(page.locator('select')).toBeVisible();
  164 |     await page.selectOption('select', 'INCOME');
  165 |     await expect(page.locator('select')).toHaveValue('INCOME');
  166 |   });
  167 | 
  168 |   test('modal opens and loads data', async ({ page }) => {
  169 |     await page.goto('/transactions');
```