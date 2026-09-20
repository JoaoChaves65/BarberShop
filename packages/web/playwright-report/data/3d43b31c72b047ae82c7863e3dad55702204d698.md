# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-states.spec.ts >> UI States - Transactions >> modal opens and loads data
- Location: e2e/ui-states.spec.ts:168:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Carregando agendamentos e barbeiros...')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Carregando agendamentos e barbeiros...') with timeout 5000ms
  - waiting for getByText('Carregando agendamentos e barbeiros...')

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
  - heading "Transações" [level=1]
  - button "Nova Transação"
  - combobox:
    - option "Todos os tipos" [selected]
    - option "Receitas"
    - option "Despesas"
  - table:
    - rowgroup:
      - row "Tipo Categoria Valor Data Descrição Agendamento Barbeiro Ações":
        - columnheader "Tipo"
        - columnheader "Categoria"
        - columnheader "Valor"
        - columnheader "Data"
        - columnheader "Descrição"
        - columnheader "Agendamento"
        - columnheader "Barbeiro"
        - columnheader "Ações"
    - rowgroup:
      - row "Receita Corte R$ 0,45 13/09/2026 Corte masculino clássico - Carlos Cliente - c41097c2 Editar":
        - cell "Receita"
        - cell "Corte"
        - cell "R$ 0,45"
        - cell "13/09/2026"
        - cell "Corte masculino clássico - Carlos Cliente"
        - cell "-"
        - cell "c41097c2"
        - cell "Editar":
          - button "Editar"
      - row "Receita Barba R$ 0,35 13/09/2026 Barba completa - Carlos Cliente - c41097c2 Editar":
        - cell "Receita"
        - cell "Barba"
        - cell "R$ 0,35"
        - cell "13/09/2026"
        - cell "Barba completa - Carlos Cliente"
        - cell "-"
        - cell "c41097c2"
        - cell "Editar":
          - button "Editar"
      - row "Receita Corte Feminino R$ 0,80 15/09/2026 Corte feminino - Ana Cliente - 798ea74a Editar":
        - cell "Receita"
        - cell "Corte Feminino"
        - cell "R$ 0,80"
        - cell "15/09/2026"
        - cell "Corte feminino - Ana Cliente"
        - cell "-"
        - cell "798ea74a"
        - cell "Editar":
          - button "Editar"
      - row "Receita Coloração R$ 1,20 15/09/2026 Coloração - Ana Cliente - 798ea74a Editar":
        - cell "Receita"
        - cell "Coloração"
        - cell "R$ 1,20"
        - cell "15/09/2026"
        - cell "Coloração - Ana Cliente"
        - cell "-"
        - cell "798ea74a"
        - cell "Editar":
          - button "Editar"
      - row "Despesa Produtos R$ 1,50 20/09/2026 Compra de shampoos e pomadas - - Editar":
        - cell "Despesa"
        - cell "Produtos"
        - cell "R$ 1,50"
        - cell "20/09/2026"
        - cell "Compra de shampoos e pomadas"
        - cell "-"
        - cell "-"
        - cell "Editar":
          - button "Editar"
      - row "Despesa Aluguel R$ 20,00 20/09/2026 Aluguel do espaço - Maio - - Editar":
        - cell "Despesa"
        - cell "Aluguel"
        - cell "R$ 20,00"
        - cell "20/09/2026"
        - cell "Aluguel do espaço - Maio"
        - cell "-"
        - cell "-"
        - cell "Editar":
          - button "Editar"
      - row "Despesa Marketing R$ 3,00 20/09/2026 Anúncios Instagram - - Editar":
        - cell "Despesa"
        - cell "Marketing"
        - cell "R$ 3,00"
        - cell "20/09/2026"
        - cell "Anúncios Instagram"
        - cell "-"
        - cell "-"
        - cell "Editar":
          - button "Editar"
  - button "Anterior" [disabled]
  - text: Página 1 de 1 (7 total)
  - button "Próxima" [disabled]
  - heading "Nova Transação" [level=2]
  - button "×"
  - text: Tipo *
  - combobox "Tipo *":
    - option "Selecione o tipo" [selected]
    - option "Receita"
    - option "Despesa"
  - text: Categoria *
  - textbox "Categoria *":
    - /placeholder: "Ex: Corte, Barba, Produtos, Aluguel, etc."
  - text: Valor *
  - spinbutton "Valor *"
  - text: Descrição
  - textbox "Descrição":
    - /placeholder: Descrição opcional
  - text: Data *
  - textbox "Data *": 2026-09-20
  - text: Agendamento (opcional)
  - combobox "Agendamento (opcional)":
    - option "Nenhum" [selected]
    - option "e8fce9ff - 12/09/2026, 21:08:28"
    - option "3761ecaa - 14/09/2026, 21:08:28"
    - option "aab04931 - 18/09/2026, 21:08:28"
    - option "61f88a85 - 20/09/2026, 21:08:28"
    - option "033e89a4 - 20/09/2026, 23:08:28"
    - option "f3c940ef - 21/09/2026, 01:08:28"
  - text: Barbeiro (opcional)
  - combobox "Barbeiro (opcional)":
    - option "Nenhum" [selected]
    - option "João Barbeiro (Corte clássico e barba)"
    - option "Maria Barbeira (Corte feminino e coloração)"
  - button "Cancelar"
  - button "Criar"
```

# Test source

```ts
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
  170 |     await page.click('button:has-text("Nova Transação")');
> 171 |     await expect(page.getByText('Carregando agendamentos e barbeiros...')).toBeVisible();
      |                                                                            ^ Error: expect(locator).toBeVisible() failed
  172 |     await expect(page.locator('select[name="appointmentId"]')).toBeVisible({ timeout: 5000 });
  173 |   });
  174 | });
  175 | 
```