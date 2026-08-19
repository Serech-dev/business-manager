# Business Manager

Business Manager is a web-based business management system designed to replace a spreadsheet-based workflow for recording sales, services, cash exchanges, and provider transactions.

The project focuses on making day-to-day operations faster and easier than the existing spreadsheet while preserving the important financial information the business needs.

## Current Status

Early development.

The current version contains the initial project structure and authentication system.

Implemented:

* User registration
* User login
* Token authentication
* Protected routes
* User logout
* PostgreSQL database
* React/Vite frontend
* Django REST Framework backend

## Technology

### Backend

* Python
* Django
* Django REST Framework
* PostgreSQL
* Token Authentication

### Frontend

* React
* Vite
* React Router
* Axios
* Tailwind CSS
* React Hot Toast

## Project Structure

```text
business-manager/
├── backend/
│   ├── accounts/
│   ├── business/
│   ├── config/
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/
    ├── src/
    ├── public/
    ├── package.json
    └── vite.config.js
```

## Development Goals

The system is being developed in phases.

### Phase 1 — Core Business Workflow

Replace the current spreadsheet workflow with a system capable of handling:

* Sales
* Products within transactions
* Services
* Cash/virtual money exchanges
* Provider transactions
* Day closing and basic financial summaries

Transactions should be composed of individual items rather than forcing the user to manually enter every resulting value.

The system should calculate totals, payments, exchange fees, and other derived values automatically wherever possible.

A particular requirement is supporting transactions involving both a sale and a cash exchange ("extra cash"), where the exchange fee applies only to the exchanged/spent portion according to the business's existing workflow.

### Phase 2 — Business Management

Future modules may include:

* Employees
* Clients
* Products
* Notifications
* Additional workflow automation

The focus is on simplifying the user's workflow rather than reproducing the complexity of the existing spreadsheet.

### Phase 3 — Advanced Features

Potential future functionality includes:

* In-depth analytics
* Subscription management
* Additional integrations
* Banking-related functionality
* MercadoPago/payment verification integrations

## Design Principles

The spreadsheet is treated as a source of business requirements, not as a UI specification.

The application should:

* Reduce manual calculations.
* Reduce duplicated data entry.
* Make important financial information immediately visible.
* Automatically calculate derived values where possible.
* Keep transactions understandable and auditable.
* Notify users about important changes or pending actions.
* Avoid reproducing obsolete spreadsheet fields when the underlying information can be represented more effectively.
* Keep the workflow fast and straightforward.

## Authentication

Business data is associated with user accounts from the beginning of the project.

This is intentional: future business entities should have clear ownership relationships rather than requiring ownership to be retrofitted later.

## Development

### Backend

Create and activate the virtual environment:

```bash
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the development server:

```bash
python manage.py runserver
```

### Frontend

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The frontend communicates with the Django API through the `VITE_API_URL` environment variable.

## Environment

The frontend requires an environment file containing the backend API URL:

```env
VITE_API_URL=http://localhost:8000/api/
```

Backend secrets and database credentials should be stored in environment variables and should not be committed to the repository.
