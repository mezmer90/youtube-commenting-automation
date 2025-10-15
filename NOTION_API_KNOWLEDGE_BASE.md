# Notion API Comprehensive Knowledge Base

## Table of Contents
1. [Overview](#overview)
2. [Authentication & Setup](#authentication--setup)
3. [Core Concepts](#core-concepts)
4. [Databases & Data Sources](#databases--data-sources)
5. [Pages](#pages)
6. [Properties & Property Types](#properties--property-types)
7. [Blocks & Page Content](#blocks--page-content)
8. [Rich Text](#rich-text)
9. [Querying, Filtering & Sorting](#querying-filtering--sorting)
10. [Templates](#templates)
11. [Files & Media](#files--media)
12. [Webhooks](#webhooks)
13. [Best Practices](#best-practices)
14. [Common Patterns](#common-patterns)
15. [Error Handling](#error-handling)
16. [API Reference Quick Links](#api-reference-quick-links)

---

## Overview

### What is the Notion API?

The Notion API is a REST API that allows programmatic interaction with Notion workspaces. It enables developers to:

- Create, read, and update pages
- Manage databases and data sources
- Query and filter database entries
- Add and retrieve page content (blocks)
- Handle comments
- Upload files and media
- Search workspace content

### Integration Types

**Internal Integrations:**
- Private to a single workspace
- Simpler authorization flow
- Only accessible by workspace members
- Created by Workspace Owners

**Public Integrations:**
- Available across multiple workspaces
- OAuth 2.0 authorization flow
- Must undergo Notion security review
- Available to any Notion user

### API Versioning

Current API version: **2025-09-03**

Always specify the API version in the header:
```
Notion-Version: 2025-09-03
```

---

## Authentication & Setup

### Step 1: Create an Integration

1. Go to https://www.notion.com/my-integrations
2. Click "+ New integration"
3. Enter integration name and select workspace
4. Save the integration

### Step 2: Get Your API Secret

1. Go to the Configuration tab
2. Copy the "Internal Integration Secret"
3. Store it securely (use environment variables)

**Important:** Never commit API secrets to version control!

### Step 3: Grant Page Permissions

Integrations need explicit permission to access pages:

1. Open the target page in Notion
2. Click the "..." menu (top-right)
3. Scroll to "+ Add Connections"
4. Select your integration
5. Confirm access

**Permissions cascade:** If you give access to a parent page, the integration can access all child pages.

### Authentication Header

All API requests require the authorization header:

```javascript
Authorization: Bearer YOUR_API_SECRET
```

### SDK Setup (JavaScript/TypeScript)

```bash
npm install @notionhq/client
```

```javascript
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});
```

---

## Core Concepts

### The Bot User

When you create an integration, Notion creates a "bot" user. This bot:
- Has its own permissions
- Can be granted access to pages
- Appears in page history
- Has workspace-specific limits (e.g., file upload size)

### Object Types

All Notion API objects have an `object` property indicating their type:

- `database` - A database container
- `data_source` - A collection of pages within a database
- `page` - A page (can be standalone or in a data source)
- `block` - Content within a page
- `user` - A Notion user or bot
- `list` - A paginated list of objects

### IDs

**Format:** UUIDs in the format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Where to find IDs:**

**Page ID:**
```
URL: https://www.notion.so/workspace/Page-Title-1429989fe8ac4effbc8f57f56486db54

Page ID: 1429989f-e8ac-4eff-bc8f-57f56486db54
```

**Database ID:**
```
URL: https://www.notion.so/workspace/{database_id}?v={view_id}

Extract the {database_id} portion
```

**Data Source ID:**
- Use the Retrieve Database API to get `data_sources` array
- Or copy from "Manage data sources" menu in Notion app

### Pagination

Many endpoints return paginated results:

```javascript
{
  "object": "list",
  "results": [...],
  "has_more": true,
  "next_cursor": "abc123"
}
```

**Parameters:**
- `start_cursor` - Cursor from previous response
- `page_size` - Number of results (max 100)

**Pattern:**
```javascript
let cursor = undefined;
const allResults = [];

do {
  const response = await notion.databases.query({
    database_id: databaseId,
    start_cursor: cursor,
    page_size: 100
  });

  allResults.push(...response.results);
  cursor = response.next_cursor;
} while (cursor);
```

---

## Databases & Data Sources

### Terminology

**Database:** A container for one or more data sources
- Has a title, icon, and cover
- Contains a list of data sources
- Parent can be a page or workspace

**Data Source:** A collection of pages with a schema
- Has properties (columns/schema)
- Contains pages (rows/items)
- Each data source has an ID

**Multi-Source Databases:** A single database can have multiple data sources (new in 2025-09-03)

### Database Object Structure

```javascript
{
  "object": "database",
  "id": "248104cd-477e-80fd-b757-e945d38000bd",
  "title": [
    {
      "type": "text",
      "text": {
        "content": "Grocery DB"
      }
    }
  ],
  "parent": {
    "type": "page_id",
    "page_id": "255104cd-477e-808c-b279-d39ab803a7d2"
  },
  "is_inline": false,
  "in_trash": false,
  "created_time": "2025-08-07T10:11:07.504Z",
  "last_edited_time": "2025-08-10T15:53:11.386Z",
  "data_sources": [
    {
      "id": "248104cd-477e-80af-bc30-000bd28de8f9",
      "name": "Grocery list"
    }
  ],
  "url": "https://www.notion.so/...",
  "icon": null,
  "cover": null
}
```

### Data Source Object Structure

```javascript
{
  "object": "data_source",
  "id": "bc1211ca-e3f1-4939-ae34-5260b16f627c",
  "created_time": "2021-07-08T23:50:00.000Z",
  "last_edited_time": "2021-07-08T23:50:00.000Z",
  "properties": {
    "Name": {
      "id": "title",
      "name": "Name",
      "type": "title",
      "title": {}
    },
    "Price": {
      "id": "fk%5EY",
      "name": "Price",
      "type": "number",
      "number": {
        "format": "dollar"
      }
    },
    "Last ordered": {
      "id": "%5D%5C%5CR%5B",
      "name": "Last ordered",
      "type": "date",
      "date": {}
    }
  },
  "parent": {
    "type": "database_id",
    "database_id": "6ee911d9-189c-4844-93e8-260c1438b6e4"
  },
  "database_parent": {
    "type": "page_id",
    "page_id": "98ad959b-2b6a-4774-80ee-00246fb0ea9b"
  }
}
```

### Database Schema (Properties)

The `properties` object defines the columns/schema of a data source:

**Pattern:**
```javascript
"properties": {
  "Property Name": {
    "id": "unique_id",
    "name": "Property Name",
    "type": "property_type",
    "property_type": {
      // type-specific configuration
    }
  }
}
```

**Key points:**
- Every data source has exactly ONE property with `type: "title"`
- The title property represents the page name
- Property IDs are URL-encoded strings
- Each property type has type-specific configuration

### API Operations: Databases

#### Retrieve a Database

```javascript
// GET /v1/databases/:database_id
const database = await notion.databases.retrieve({
  database_id: "248104cd-477e-80fd-b757-e945d38000bd"
});

// Returns database object with data_sources array
console.log(database.data_sources);
```

#### Retrieve a Data Source

```javascript
// GET /v1/data_sources/:data_source_id
const dataSource = await notion.dataSources.retrieve({
  data_source_id: "248104cd-477e-80af-bc30-000bd28de8f9"
});

// Returns data source object with properties (schema)
console.log(dataSource.properties);
```

#### Create a Database

```javascript
// POST /v1/databases
const newDatabase = await notion.databases.create({
  parent: {
    type: "page_id",
    page_id: "parent-page-id"
  },
  title: [
    {
      type: "text",
      text: { content: "My New Database" }
    }
  ],
  initial_data_source: {
    properties: {
      "Name": {
        title: {}
      },
      "Status": {
        select: {
          options: [
            { name: "To Do", color: "red" },
            { name: "In Progress", color: "yellow" },
            { name: "Done", color: "green" }
          ]
        }
      }
    }
  },
  icon: {
    type: "emoji",
    emoji: "📋"
  }
});
```

#### Update a Database

```javascript
// PATCH /v1/databases/:database_id
// Updates database-level properties: title, icon, cover, parent, is_inline
await notion.databases.update({
  database_id: "database-id",
  title: [
    {
      type: "text",
      text: { content: "Updated Database Title" }
    }
  ],
  icon: {
    type: "emoji",
    emoji: "🎯"
  }
});
```

#### Update a Data Source

```javascript
// PATCH /v1/data_sources/:data_source_id
// Updates data source schema (properties)
await notion.dataSources.update({
  data_source_id: "data-source-id",
  properties: {
    "New Property": {
      type: "checkbox",
      checkbox: {}
    },
    "Property to Remove": null  // Set to null to remove
  }
});
```

#### Query a Data Source

```javascript
// POST /v1/data_sources/:data_source_id/query
const response = await notion.dataSources.query({
  data_source_id: "data-source-id",
  filter: {
    property: "Status",
    select: {
      equals: "In Progress"
    }
  },
  sorts: [
    {
      property: "Created",
      direction: "descending"
    }
  ],
  page_size: 100
});
```

---

## Pages

### What is a Page?

Pages are the fundamental content units in Notion:
- Can be standalone or within a data source
- Have properties (when in a data source)
- Have content (blocks)
- Have a title

### Page Object Structure

```javascript
{
  "object": "page",
  "id": "page-id",
  "created_time": "2025-01-15T00:00:00.000Z",
  "last_edited_time": "2025-01-15T00:00:00.000Z",
  "created_by": { "object": "user", "id": "user-id" },
  "last_edited_by": { "object": "user", "id": "user-id" },
  "parent": {
    "type": "data_source_id",
    "data_source_id": "data-source-id"
  },
  "archived": false,
  "in_trash": false,
  "properties": {
    // Property values (see Properties section)
  },
  "url": "https://www.notion.so/...",
  "public_url": null
}
```

### Parent Types

Pages can have different parent types:

```javascript
// Page parent
{
  "type": "page_id",
  "page_id": "parent-page-id"
}

// Data source parent
{
  "type": "data_source_id",
  "data_source_id": "data-source-id"
}

// Workspace parent (for top-level pages)
{
  "type": "workspace",
  "workspace": true
}
```

### API Operations: Pages

#### Create a Page

**In a data source:**
```javascript
// POST /v1/pages
const page = await notion.pages.create({
  parent: {
    type: "data_source_id",
    data_source_id: "data-source-id"
  },
  properties: {
    "Name": {
      title: [
        {
          text: { content: "New Task" }
        }
      ]
    },
    "Status": {
      select: { name: "To Do" }
    },
    "Due Date": {
      date: { start: "2025-01-20" }
    }
  },
  children: [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "Task description here" }
          }
        ]
      }
    }
  ]
});
```

**As a standalone page:**
```javascript
const page = await notion.pages.create({
  parent: {
    type: "page_id",
    page_id: "parent-page-id"
  },
  properties: {
    "title": {
      title: [
        {
          text: { content: "My New Page" }
        }
      ]
    }
  },
  children: [
    // blocks...
  ]
});
```

#### Retrieve a Page

```javascript
// GET /v1/pages/:page_id
const page = await notion.pages.retrieve({
  page_id: "page-id"
});
```

#### Update Page Properties

```javascript
// PATCH /v1/pages/:page_id
const updatedPage = await notion.pages.update({
  page_id: "page-id",
  properties: {
    "Status": {
      select: { name: "Done" }
    },
    "Completed": {
      checkbox: true
    }
  }
});
```

#### Archive/Trash a Page

```javascript
await notion.pages.update({
  page_id: "page-id",
  archived: true
});

// or
await notion.pages.update({
  page_id: "page-id",
  in_trash: true
});
```

---

## Properties & Property Types

### Property Value Pattern

All property values follow this pattern:

```javascript
"Property Name": {
  "type": "property_type",
  "property_type": {
    // type-specific data
  }
}
```

### Complete Property Type Reference

#### 1. Title

**Required:** Every data source must have exactly one title property.

```javascript
"Name": {
  "type": "title",
  "title": [
    {
      "type": "text",
      "text": { "content": "Page Title" }
    }
  ]
}
```

#### 2. Rich Text

```javascript
"Description": {
  "type": "rich_text",
  "rich_text": [
    {
      "type": "text",
      "text": { "content": "Some text content" }
    }
  ]
}
```

#### 3. Number

```javascript
"Price": {
  "type": "number",
  "number": 42.99
}
```

**Schema configuration:**
```javascript
"Price": {
  "type": "number",
  "number": {
    "format": "dollar"  // or "number", "percent", "euro", etc.
  }
}
```

#### 4. Select

Single selection from predefined options.

```javascript
"Status": {
  "type": "select",
  "select": {
    "name": "In Progress"
  }
}
```

**Schema configuration:**
```javascript
"Status": {
  "type": "select",
  "select": {
    "options": [
      { "name": "To Do", "color": "red" },
      { "name": "In Progress", "color": "yellow" },
      { "name": "Done", "color": "green" }
    ]
  }
}
```

#### 5. Multi-select

Multiple selections from predefined options.

```javascript
"Tags": {
  "type": "multi_select",
  "multi_select": [
    { "name": "urgent" },
    { "name": "bug" }
  ]
}
```

**Schema configuration:**
```javascript
"Tags": {
  "type": "multi_select",
  "multi_select": {
    "options": [
      { "name": "urgent", "color": "red" },
      { "name": "bug", "color": "orange" },
      { "name": "feature", "color": "blue" }
    ]
  }
}
```

#### 6. Date

```javascript
"Due Date": {
  "type": "date",
  "date": {
    "start": "2025-01-20",
    "end": null,
    "time_zone": null
  }
}
```

**Date range:**
```javascript
"date": {
  "start": "2025-01-20",
  "end": "2025-01-25"
}
```

**Date with time:**
```javascript
"date": {
  "start": "2025-01-20T14:30:00.000Z"
}
```

#### 7. Checkbox

```javascript
"Completed": {
  "type": "checkbox",
  "checkbox": true
}
```

#### 8. URL

```javascript
"Website": {
  "type": "url",
  "url": "https://example.com"
}
```

#### 9. Email

```javascript
"Email": {
  "type": "email",
  "email": "user@example.com"
}
```

#### 10. Phone Number

```javascript
"Phone": {
  "type": "phone_number",
  "phone_number": "+1-234-567-8900"
}
```

#### 11. People

```javascript
"Assignee": {
  "type": "people",
  "people": [
    {
      "object": "user",
      "id": "user-id-123"
    }
  ]
}
```

#### 12. Files

```javascript
"Attachments": {
  "type": "files",
  "files": [
    {
      "name": "document.pdf",
      "type": "external",
      "external": {
        "url": "https://example.com/document.pdf"
      }
    }
  ]
}
```

#### 13. Relation

Links to pages in another data source.

```javascript
"Related Tasks": {
  "type": "relation",
  "relation": [
    { "id": "page-id-1" },
    { "id": "page-id-2" }
  ]
}
```

**Schema configuration:**
```javascript
"Related Tasks": {
  "type": "relation",
  "relation": {
    "database_id": "related-database-id",
    "data_source_id": "related-data-source-id",
    "type": "dual_property",  // or "single_property"
    "dual_property": {
      "synced_property_name": "Tasks",
      "synced_property_id": "prop-id"
    }
  }
}
```

#### 14. Rollup

Aggregates values from related pages.

**Read-only in API.** Cannot be set directly; computed by Notion.

```javascript
"Total Cost": {
  "type": "rollup",
  "rollup": {
    "type": "number",
    "number": 150.50,
    "function": "sum"
  }
}
```

#### 15. Formula

Computed property based on a formula.

**Read-only in API.** Cannot be set directly; computed by Notion.

```javascript
"Full Name": {
  "type": "formula",
  "formula": {
    "type": "string",
    "string": "John Doe"
  }
}
```

#### 16. Status

Custom status workflow (like Select but with workflow support).

```javascript
"Status": {
  "type": "status",
  "status": {
    "name": "In Progress"
  }
}
```

#### 17. Created Time

**Read-only.** Timestamp when page was created.

```javascript
"Created": {
  "type": "created_time",
  "created_time": "2025-01-15T00:00:00.000Z"
}
```

#### 18. Created By

**Read-only.** User who created the page.

```javascript
"Created By": {
  "type": "created_by",
  "created_by": {
    "object": "user",
    "id": "user-id"
  }
}
```

#### 19. Last Edited Time

**Read-only.** Timestamp when page was last edited.

```javascript
"Last Edited": {
  "type": "last_edited_time",
  "last_edited_time": "2025-01-15T10:30:00.000Z"
}
```

#### 20. Last Edited By

**Read-only.** User who last edited the page.

```javascript
"Last Edited By": {
  "type": "last_edited_by",
  "last_edited_by": {
    "object": "user",
    "id": "user-id"
  }
}
```

#### 21. Unique ID

**Read-only.** Auto-generated unique ID for each page.

```javascript
"ID": {
  "type": "unique_id",
  "unique_id": {
    "prefix": "TASK",
    "number": 123
  }
}
```

---

## Blocks & Page Content

### What are Blocks?

Blocks are the building blocks of page content:
- Paragraphs, headings, lists
- Media (images, videos, files)
- Embeds, code blocks
- Databases and child pages
- Toggle lists, callouts

### Block Object Pattern

```javascript
{
  "object": "block",
  "id": "block-id",
  "type": "block_type",
  "created_time": "2025-01-15T00:00:00.000Z",
  "last_edited_time": "2025-01-15T00:00:00.000Z",
  "has_children": false,
  "block_type": {
    // type-specific data
  }
}
```

### Common Block Types

#### 1. Paragraph

```javascript
{
  "object": "block",
  "type": "paragraph",
  "paragraph": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "This is a paragraph." }
      }
    ],
    "color": "default"
  }
}
```

#### 2. Headings

```javascript
// Heading 1
{
  "object": "block",
  "type": "heading_1",
  "heading_1": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "Heading 1" }
      }
    ],
    "color": "default"
  }
}

// Heading 2
{
  "type": "heading_2",
  "heading_2": { /* ... */ }
}

// Heading 3
{
  "type": "heading_3",
  "heading_3": { /* ... */ }
}
```

#### 3. Bulleted List

```javascript
{
  "object": "block",
  "type": "bulleted_list_item",
  "bulleted_list_item": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "List item" }
      }
    ],
    "color": "default"
  }
}
```

#### 4. Numbered List

```javascript
{
  "object": "block",
  "type": "numbered_list_item",
  "numbered_list_item": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "List item" }
      }
    ],
    "color": "default"
  }
}
```

#### 5. To-Do

```javascript
{
  "object": "block",
  "type": "to_do",
  "to_do": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "Task to complete" }
      }
    ],
    "checked": false,
    "color": "default"
  }
}
```

#### 6. Toggle

```javascript
{
  "object": "block",
  "type": "toggle",
  "toggle": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "Toggle title" }
      }
    ],
    "color": "default",
    "children": [
      // Nested blocks
    ]
  }
}
```

#### 7. Code Block

```javascript
{
  "object": "block",
  "type": "code",
  "code": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "const x = 42;" }
      }
    ],
    "language": "javascript",
    "caption": []
  }
}
```

**Supported languages:** `javascript`, `python`, `java`, `c`, `cpp`, `csharp`, `go`, `rust`, `typescript`, `sql`, `html`, `css`, `json`, `xml`, etc.

#### 8. Quote

```javascript
{
  "object": "block",
  "type": "quote",
  "quote": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "This is a quote." }
      }
    ],
    "color": "default"
  }
}
```

#### 9. Callout

```javascript
{
  "object": "block",
  "type": "callout",
  "callout": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "Important information!" }
      }
    ],
    "icon": {
      "type": "emoji",
      "emoji": "💡"
    },
    "color": "yellow_background"
  }
}
```

#### 10. Divider

```javascript
{
  "object": "block",
  "type": "divider",
  "divider": {}
}
```

#### 11. Image

```javascript
{
  "object": "block",
  "type": "image",
  "image": {
    "type": "external",
    "external": {
      "url": "https://example.com/image.jpg"
    },
    "caption": [
      {
        "type": "text",
        "text": { "content": "Image caption" }
      }
    ]
  }
}
```

#### 12. Video

```javascript
{
  "object": "block",
  "type": "video",
  "video": {
    "type": "external",
    "external": {
      "url": "https://www.youtube.com/watch?v=..."
    }
  }
}
```

#### 13. File

```javascript
{
  "object": "block",
  "type": "file",
  "file": {
    "type": "external",
    "external": {
      "url": "https://example.com/document.pdf"
    },
    "caption": []
  }
}
```

#### 14. PDF

```javascript
{
  "object": "block",
  "type": "pdf",
  "pdf": {
    "type": "external",
    "external": {
      "url": "https://example.com/document.pdf"
    }
  }
}
```

#### 15. Bookmark

```javascript
{
  "object": "block",
  "type": "bookmark",
  "bookmark": {
    "url": "https://example.com",
    "caption": []
  }
}
```

#### 16. Table

```javascript
{
  "object": "block",
  "type": "table",
  "table": {
    "table_width": 3,
    "has_column_header": true,
    "has_row_header": false,
    "children": [
      {
        "type": "table_row",
        "table_row": {
          "cells": [
            [{ "type": "text", "text": { "content": "Header 1" } }],
            [{ "type": "text", "text": { "content": "Header 2" } }],
            [{ "type": "text", "text": { "content": "Header 3" } }]
          ]
        }
      },
      {
        "type": "table_row",
        "table_row": {
          "cells": [
            [{ "type": "text", "text": { "content": "Cell 1" } }],
            [{ "type": "text", "text": { "content": "Cell 2" } }],
            [{ "type": "text", "text": { "content": "Cell 3" } }]
          ]
        }
      }
    ]
  }
}
```

#### 17. Child Page

**Read-only.** Represents a reference to a child page.

```javascript
{
  "object": "block",
  "type": "child_page",
  "child_page": {
    "title": "Child Page Title"
  }
}
```

#### 18. Child Database

**Read-only.** Represents a reference to a child database.

```javascript
{
  "object": "block",
  "type": "child_database",
  "child_database": {
    "title": "Database Title"
  }
}
```

### Nested Blocks

Some blocks can have children:

```javascript
{
  "object": "block",
  "type": "paragraph",
  "has_children": true,
  "paragraph": {
    "rich_text": [
      {
        "type": "text",
        "text": { "content": "Parent paragraph" }
      }
    ],
    "children": [
      {
        "object": "block",
        "type": "to_do",
        "to_do": {
          "rich_text": [
            {
              "type": "text",
              "text": { "content": "Nested todo" }
            }
          ],
          "checked": false
        }
      }
    ]
  }
}
```

**Block types that support children:**
- `paragraph`
- `bulleted_list_item`
- `numbered_list_item`
- `to_do`
- `toggle`
- `quote`
- `callout`
- `column`
- `column_list`
- `table`

### API Operations: Blocks

#### Retrieve Block Children

```javascript
// GET /v1/blocks/:block_id/children
const response = await notion.blocks.children.list({
  block_id: "page-id-or-block-id",
  page_size: 100
});

const blocks = response.results;
```

#### Append Block Children

```javascript
// PATCH /v1/blocks/:block_id/children
await notion.blocks.children.append({
  block_id: "page-id-or-block-id",
  children: [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "New paragraph" }
          }
        ]
      }
    }
  ]
});
```

**Append after specific block:**
```javascript
await notion.blocks.children.append({
  block_id: "parent-block-id",
  children: [ /* ... */ ],
  after: "existing-child-block-id"
});
```

#### Update a Block

```javascript
// PATCH /v1/blocks/:block_id
await notion.blocks.update({
  block_id: "block-id",
  paragraph: {
    rich_text: [
      {
        type: "text",
        text: { content: "Updated content" }
      }
    ]
  }
});
```

#### Delete a Block

```javascript
// DELETE /v1/blocks/:block_id
await notion.blocks.delete({
  block_id: "block-id"
});
```

#### Retrieve a Block

```javascript
// GET /v1/blocks/:block_id
const block = await notion.blocks.retrieve({
  block_id: "block-id"
});
```

### Reading Nested Content Recursively

```javascript
async function getAllBlocks(blockId, allBlocks = []) {
  const { results, has_more, next_cursor } = await notion.blocks.children.list({
    block_id: blockId,
    start_cursor: undefined
  });

  allBlocks.push(...results);

  // Recursively get children
  for (const block of results) {
    if (block.has_children) {
      await getAllBlocks(block.id, allBlocks);
    }
  }

  // Handle pagination
  if (has_more) {
    await getAllBlocks(blockId, allBlocks, next_cursor);
  }

  return allBlocks;
}
```

---

## Rich Text

### Rich Text Object

Rich text is used in:
- Page properties (title, rich_text)
- Block content (paragraphs, headings, etc.)
- Captions

**Basic structure:**
```javascript
{
  "type": "text",
  "text": {
    "content": "Hello World",
    "link": null
  },
  "annotations": {
    "bold": false,
    "italic": false,
    "strikethrough": false,
    "underline": false,
    "code": false,
    "color": "default"
  },
  "plain_text": "Hello World",
  "href": null
}
```

### Rich Text Types

#### 1. Text

```javascript
{
  "type": "text",
  "text": {
    "content": "Regular text",
    "link": null
  },
  "annotations": { /* ... */ }
}
```

#### 2. Text with Link

```javascript
{
  "type": "text",
  "text": {
    "content": "Click here",
    "link": {
      "url": "https://example.com"
    }
  },
  "annotations": { /* ... */ }
}
```

#### 3. Mention (User)

```javascript
{
  "type": "mention",
  "mention": {
    "type": "user",
    "user": {
      "object": "user",
      "id": "user-id"
    }
  },
  "annotations": { /* ... */ },
  "plain_text": "@John Doe"
}
```

#### 4. Mention (Page)

```javascript
{
  "type": "mention",
  "mention": {
    "type": "page",
    "page": {
      "id": "page-id"
    }
  },
  "annotations": { /* ... */ },
  "plain_text": "Page Title"
}
```

#### 5. Mention (Database)

```javascript
{
  "type": "mention",
  "mention": {
    "type": "database",
    "database": {
      "id": "database-id"
    }
  },
  "annotations": { /* ... */ }
}
```

#### 6. Mention (Date)

```javascript
{
  "type": "mention",
  "mention": {
    "type": "date",
    "date": {
      "start": "2025-01-15"
    }
  },
  "annotations": { /* ... */ }
}
```

#### 7. Equation

```javascript
{
  "type": "equation",
  "equation": {
    "expression": "E = mc^2"
  },
  "annotations": { /* ... */ },
  "plain_text": "E = mc^2"
}
```

### Annotations (Styling)

```javascript
"annotations": {
  "bold": true,
  "italic": true,
  "strikethrough": false,
  "underline": false,
  "code": true,
  "color": "red"
}
```

**Available colors:**
- `default`, `gray`, `brown`, `orange`, `yellow`
- `green`, `blue`, `purple`, `pink`, `red`
- Background variants: `gray_background`, `brown_background`, etc.

### Building Complex Rich Text

```javascript
"rich_text": [
  {
    "type": "text",
    "text": { "content": "This is " },
    "annotations": { "bold": false }
  },
  {
    "type": "text",
    "text": { "content": "bold" },
    "annotations": { "bold": true }
  },
  {
    "type": "text",
    "text": { "content": " and this is " }
  },
  {
    "type": "text",
    "text": { "content": "italic" },
    "annotations": { "italic": true }
  },
  {
    "type": "text",
    "text": { "content": " and this is a " }
  },
  {
    "type": "text",
    "text": {
      "content": "link",
      "link": { "url": "https://example.com" }
    },
    "annotations": { "color": "blue" }
  }
]
```

---

## Querying, Filtering & Sorting

### Query a Data Source

```javascript
// POST /v1/data_sources/:data_source_id/query
const response = await notion.dataSources.query({
  data_source_id: "data-source-id",
  filter: { /* filter object */ },
  sorts: [ /* sort objects */ ],
  start_cursor: undefined,
  page_size: 100
});
```

### Filters

#### Filter Structure

```javascript
{
  "property": "Property Name",
  "property_type": {
    "condition": value
  }
}
```

#### Text Filters

```javascript
// Equals
{
  "property": "Name",
  "rich_text": {
    "equals": "Task Title"
  }
}

// Contains
{
  "property": "Description",
  "rich_text": {
    "contains": "urgent"
  }
}

// Starts with
{
  "property": "Name",
  "rich_text": {
    "starts_with": "Project"
  }
}

// Ends with
{
  "property": "Name",
  "rich_text": {
    "ends_with": "Draft"
  }
}

// Is empty
{
  "property": "Description",
  "rich_text": {
    "is_empty": true
  }
}

// Is not empty
{
  "property": "Description",
  "rich_text": {
    "is_not_empty": true
  }
}
```

#### Number Filters

```javascript
// Equals
{
  "property": "Price",
  "number": {
    "equals": 42
  }
}

// Greater than
{
  "property": "Price",
  "number": {
    "greater_than": 100
  }
}

// Less than
{
  "property": "Price",
  "number": {
    "less_than": 50
  }
}

// Greater than or equal to
{
  "property": "Price",
  "number": {
    "greater_than_or_equal_to": 100
  }
}

// Less than or equal to
{
  "property": "Price",
  "number": {
    "less_than_or_equal_to": 50
  }
}

// Is empty
{
  "property": "Price",
  "number": {
    "is_empty": true
  }
}
```

#### Checkbox Filters

```javascript
// Equals
{
  "property": "Completed",
  "checkbox": {
    "equals": true
  }
}
```

#### Select Filters

```javascript
// Equals
{
  "property": "Status",
  "select": {
    "equals": "In Progress"
  }
}

// Does not equal
{
  "property": "Status",
  "select": {
    "does_not_equal": "Done"
  }
}

// Is empty
{
  "property": "Status",
  "select": {
    "is_empty": true
  }
}
```

#### Multi-select Filters

```javascript
// Contains
{
  "property": "Tags",
  "multi_select": {
    "contains": "urgent"
  }
}

// Does not contain
{
  "property": "Tags",
  "multi_select": {
    "does_not_contain": "archived"
  }
}

// Is empty
{
  "property": "Tags",
  "multi_select": {
    "is_empty": true
  }
}
```

#### Date Filters

```javascript
// Equals
{
  "property": "Due Date",
  "date": {
    "equals": "2025-01-15"
  }
}

// Before
{
  "property": "Due Date",
  "date": {
    "before": "2025-01-20"
  }
}

// After
{
  "property": "Due Date",
  "date": {
    "after": "2025-01-01"
  }
}

// On or before
{
  "property": "Due Date",
  "date": {
    "on_or_before": "2025-01-20"
  }
}

// On or after
{
  "property": "Due Date",
  "date": {
    "on_or_after": "2025-01-01"
  }
}

// Past week
{
  "property": "Last Ordered",
  "date": {
    "past_week": {}
  }
}

// Past month
{
  "property": "Last Ordered",
  "date": {
    "past_month": {}
  }
}

// Past year
{
  "property": "Last Ordered",
  "date": {
    "past_year": {}
  }
}

// Next week
{
  "property": "Due Date",
  "date": {
    "next_week": {}
  }
}

// Next month
{
  "property": "Due Date",
  "date": {
    "next_month": {}
  }
}

// Next year
{
  "property": "Due Date",
  "date": {
    "next_year": {}
  }
}

// Is empty
{
  "property": "Due Date",
  "date": {
    "is_empty": true
  }
}
```

#### People Filters

```javascript
// Contains
{
  "property": "Assignee",
  "people": {
    "contains": "user-id"
  }
}

// Does not contain
{
  "property": "Assignee",
  "people": {
    "does_not_contain": "user-id"
  }
}

// Is empty
{
  "property": "Assignee",
  "people": {
    "is_empty": true
  }
}
```

#### Relation Filters

```javascript
// Contains
{
  "property": "Related Tasks",
  "relation": {
    "contains": "page-id"
  }
}

// Does not contain
{
  "property": "Related Tasks",
  "relation": {
    "does_not_contain": "page-id"
  }
}

// Is empty
{
  "property": "Related Tasks",
  "relation": {
    "is_empty": true
  }
}
```

### Compound Filters

#### AND Filters

All conditions must be true.

```javascript
{
  "and": [
    {
      "property": "Status",
      "select": {
        "equals": "In Progress"
      }
    },
    {
      "property": "Priority",
      "select": {
        "equals": "High"
      }
    },
    {
      "property": "Assignee",
      "people": {
        "contains": "user-id"
      }
    }
  ]
}
```

#### OR Filters

At least one condition must be true.

```javascript
{
  "or": [
    {
      "property": "Status",
      "select": {
        "equals": "To Do"
      }
    },
    {
      "property": "Status",
      "select": {
        "equals": "In Progress"
      }
    }
  ]
}
```

#### Nested Compound Filters

```javascript
{
  "and": [
    {
      "property": "Status",
      "select": {
        "equals": "In Progress"
      }
    },
    {
      "or": [
        {
          "property": "Priority",
          "select": {
            "equals": "High"
          }
        },
        {
          "property": "Priority",
          "select": {
            "equals": "Urgent"
          }
        }
      ]
    }
  ]
}
```

### Sorts

#### Sort by Property

```javascript
{
  "sorts": [
    {
      "property": "Due Date",
      "direction": "ascending"  // or "descending"
    }
  ]
}
```

#### Sort by Timestamp

```javascript
{
  "sorts": [
    {
      "timestamp": "created_time",  // or "last_edited_time"
      "direction": "descending"
    }
  ]
}
```

#### Multiple Sorts

Sorts are applied in order.

```javascript
{
  "sorts": [
    {
      "property": "Priority",
      "direction": "ascending"
    },
    {
      "property": "Due Date",
      "direction": "ascending"
    },
    {
      "timestamp": "created_time",
      "direction": "descending"
    }
  ]
}
```

### Complete Query Example

```javascript
const response = await notion.dataSources.query({
  data_source_id: "data-source-id",
  filter: {
    "and": [
      {
        "property": "Status",
        "select": {
          "equals": "In Progress"
        }
      },
      {
        "property": "Due Date",
        "date": {
          "next_week": {}
        }
      }
    ]
  },
  sorts: [
    {
      "property": "Priority",
      "direction": "ascending"
    },
    {
      "property": "Due Date",
      "direction": "ascending"
    }
  ],
  page_size: 100
});

const pages = response.results;
```

---

## Templates

### What are Templates?

Database templates provide pre-configured page structures:
- Save time when creating pages
- Include default properties and content
- One template can be marked as "default"

### List Data Source Templates

```javascript
// GET /v1/data_sources/:data_source_id/templates
const response = await notion.dataSources.templates.list({
  data_source_id: "data-source-id"
});

console.log(response.templates);
// [
//   {
//     "id": "template-id-1",
//     "name": "Bug Template",
//     "is_default": true
//   },
//   {
//     "id": "template-id-2",
//     "name": "Feature Template",
//     "is_default": false
//   }
// ]
```

### Create Page from Template

#### Using Default Template

```javascript
const page = await notion.pages.create({
  parent: {
    type: "data_source_id",
    data_source_id: "data-source-id"
  },
  template: {
    type: "default"
  },
  properties: {
    "Name": {
      title: [
        {
          text: { content: "New Bug Report" }
        }
      ]
    }
  }
  // Cannot specify 'children' when using templates
});
```

#### Using Specific Template

```javascript
const page = await notion.pages.create({
  parent: {
    type: "data_source_id",
    data_source_id: "data-source-id"
  },
  template: {
    type: "template_id",
    template_id: "template-id"
  },
  properties: {
    "Name": {
      title: [
        {
          text: { content: "New Feature Request" }
        }
      ]
    }
  }
});
```

### Template Processing

**Important:** When using templates:

1. The API returns immediately with a blank page
2. Notion populates the template content asynchronously
3. Use webhooks (`page.content_updated`) to know when ready
4. Cannot specify `children` in the create request

---

## Files & Media

### Upload Methods

1. **Direct Upload (single-part)** - Files ≤ 20MB
2. **Direct Upload (multi-part)** - Files > 20MB
3. **Indirect Import** - From public URLs

### File Size Limits

- Free workspaces: 5 MiB per file
- Paid workspaces: 5 GiB per file
- Files > 20 MiB must use multi-part upload

### Get Workspace File Limit

```javascript
const user = await notion.users.retrieve({
  user_id: "bot-user-id"
});

const maxFileSize = user.bot.workspace_limits.max_file_upload_size_in_bytes;
```

### File Types

**Categories:**
- Audio: `.mp3`, `.wav`, `.m4a`, `.ogg`, etc.
- Document: `.pdf`, `.txt`, `.json`, `.doc`, `.xls`, `.ppt`, etc.
- Image: `.jpg`, `.png`, `.gif`, `.svg`, `.webp`, etc.
- Video: `.mp4`, `.mov`, `.avi`, `.webm`, etc.

### Supported Block Types

- `file`, `image`, `pdf`, `audio`, `video`
- Page properties: `files` property type
- Page-level: `icon`, `cover`

### External File (URL)

```javascript
// Add image from URL
await notion.blocks.children.append({
  block_id: "page-id",
  children: [
    {
      object: "block",
      type: "image",
      image: {
        type: "external",
        external: {
          "url": "https://example.com/image.jpg"
        }
      }
    }
  ]
});
```

### Upload File (API v2025-09-03+)

**Note:** File upload API details would go here once available in documentation.

---

## Webhooks

### What are Webhooks?

Webhooks allow your integration to receive notifications when events occur in Notion:
- Page created, updated, deleted
- Data source changes
- Database schema updates

### Webhook Versioning

Webhooks have their own API version (set in integration settings).

### Event Types (v2025-09-03)

#### Page Events
- `page.created` - New page created
- `page.content_updated` - Page content changed
- `page.property_values_updated` - Page properties changed
- `page.moved` - Page moved to different parent
- `page.deleted` - Page deleted
- `page.undeleted` - Page restored from trash

#### Data Source Events
- `data_source.created` - New data source added
- `data_source.content_updated` - Data source content changed
- `data_source.schema_updated` - Data source schema changed
- `data_source.moved` - Data source moved
- `data_source.deleted` - Data source deleted
- `data_source.undeleted` - Data source restored

#### Database Events
- `database.created` - New database created
- `database.moved` - Database moved
- `database.deleted` - Database deleted
- `database.undeleted` - Database restored

### Webhook Payload Structure

```javascript
{
  "id": "event-id",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "workspace_id": "workspace-id",
  "workspace_name": "My Workspace",
  "subscription_id": "subscription-id",
  "integration_id": "integration-id",
  "type": "page.created",
  "authors": [
    {
      "id": "user-id",
      "type": "person"
    }
  ],
  "accessible_by": [
    {
      "id": "user-id",
      "type": "person"
    },
    {
      "id": "bot-id",
      "type": "bot"
    }
  ],
  "attempt_number": 1,
  "entity": {
    "id": "page-id",
    "type": "page"
  },
  "data": {
    "parent": {
      "id": "parent-id",
      "type": "data_source",
      "data_source_id": "data-source-id"
    }
  }
}
```

### Webhook Best Practices

1. **Verify webhook signatures** (if Notion provides them)
2. **Return 200 OK quickly** - Process asynchronously
3. **Handle retries** - Notion retries failed webhooks
4. **Use `attempt_number`** to detect retries
5. **Store `entity.id`** to deduplicate events
6. **Use webhooks for real-time updates** instead of polling

---

## Best Practices

### Authentication & Security

1. **Never expose API secrets**
   - Use environment variables
   - Never commit to version control
   - Rotate secrets if exposed

2. **Request minimal permissions**
   - Only connect to necessary pages
   - Use internal integrations when possible

3. **Validate webhook payloads**
   - Check signatures
   - Verify event types
   - Validate entity IDs

### API Usage

1. **Handle rate limits**
   - Implement exponential backoff
   - Cache responses when possible
   - Use webhooks instead of polling

2. **Handle pagination**
   - Always check `has_more`
   - Use `next_cursor` for subsequent requests
   - Max page size is 100

3. **Handle errors gracefully**
   - Check for `object: "error"`
   - Log error codes and messages
   - Implement retry logic

4. **Validate before updating**
   - Use Retrieve Database to get current schema
   - Validate property types match schema
   - Handle read-only properties

### Data Modeling

1. **Use appropriate property types**
   - Title for page names
   - Select for fixed options
   - Multi-select for tags
   - Relations for connections

2. **Don't exceed schema size limits**
   - Max 50KB recommended for database schema
   - Large schemas impact performance

3. **Structure content logically**
   - Use headings for organization
   - Group related content in toggles
   - Use callouts for important info

### Performance

1. **Batch operations**
   - Append multiple blocks at once
   - Process paginated results efficiently

2. **Cache database schemas**
   - Schemas don't change frequently
   - Reduces API calls

3. **Use async operations**
   - Don't block on API calls
   - Use job queues for large operations

4. **Retrieve only what you need**
   - Use filters to narrow results
   - Don't retrieve all pages if unnecessary

---

## Common Patterns

### Pattern 1: Create Database with Pages

```javascript
// 1. Create database
const database = await notion.databases.create({
  parent: { type: "page_id", page_id: "parent-page-id" },
  title: [{ type: "text", text: { content: "Tasks" } }],
  initial_data_source: {
    properties: {
      "Name": { title: {} },
      "Status": {
        select: {
          options: [
            { name: "To Do", color: "red" },
            { name: "Done", color: "green" }
          ]
        }
      }
    }
  }
});

const dataSourceId = database.data_sources[0].id;

// 2. Add pages to data source
const pages = ["Task 1", "Task 2", "Task 3"];

for (const taskName of pages) {
  await notion.pages.create({
    parent: {
      type: "data_source_id",
      data_source_id: dataSourceId
    },
    properties: {
      "Name": {
        title: [{ text: { content: taskName } }]
      },
      "Status": {
        select: { name: "To Do" }
      }
    }
  });
}
```

### Pattern 2: Query and Update Pages

```javascript
// 1. Query for incomplete tasks
const response = await notion.dataSources.query({
  data_source_id: "data-source-id",
  filter: {
    property: "Completed",
    checkbox: {
      equals: false
    }
  }
});

// 2. Update each page
for (const page of response.results) {
  await notion.pages.update({
    page_id: page.id,
    properties: {
      "Completed": {
        checkbox: true
      },
      "Completed Date": {
        date: {
          start: new Date().toISOString().split('T')[0]
        }
      }
    }
  });
}
```

### Pattern 3: Sync External Data to Notion

```javascript
async function syncDataToNotion(externalData, dataSourceId) {
  // 1. Get existing pages
  const existingPages = await getAllPages(dataSourceId);

  // 2. Create a map of external ID -> page ID
  const pageMap = new Map();
  for (const page of existingPages) {
    const externalId = page.properties["External ID"].rich_text[0]?.plain_text;
    if (externalId) {
      pageMap.set(externalId, page.id);
    }
  }

  // 3. Create or update pages
  for (const item of externalData) {
    const pageId = pageMap.get(item.id);

    const properties = {
      "Name": {
        title: [{ text: { content: item.name } }]
      },
      "External ID": {
        rich_text: [{ text: { content: item.id } }]
      },
      "Status": {
        select: { name: item.status }
      }
    };

    if (pageId) {
      // Update existing
      await notion.pages.update({
        page_id: pageId,
        properties
      });
    } else {
      // Create new
      await notion.pages.create({
        parent: {
          type: "data_source_id",
          data_source_id: dataSourceId
        },
        properties
      });
    }
  }
}

async function getAllPages(dataSourceId) {
  let allPages = [];
  let cursor = undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100
    });

    allPages.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);

  return allPages;
}
```

### Pattern 4: Build Page with Complex Content

```javascript
async function createProjectPage(dataSourceId, projectData) {
  // 1. Create page
  const page = await notion.pages.create({
    parent: {
      type: "data_source_id",
      data_source_id: dataSourceId
    },
    properties: {
      "Name": {
        title: [{ text: { content: projectData.name } }]
      },
      "Status": {
        select: { name: "In Progress" }
      }
    },
    children: [
      // Overview section
      {
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ text: { content: "Overview" } }]
        }
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: projectData.description } }]
        }
      },

      // Tasks section
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "Tasks" } }]
        }
      },

      // Task list
      ...projectData.tasks.map(task => ({
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: [{ text: { content: task.title } }],
          checked: task.completed
        }
      })),

      // Divider
      {
        object: "block",
        type: "divider",
        divider: {}
      },

      // Notes section
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ text: { content: "Notes" } }]
        }
      },
      {
        object: "block",
        type: "callout",
        callout: {
          rich_text: [{ text: { content: "Add project notes here" } }],
          icon: { type: "emoji", emoji: "📝" },
          color: "gray_background"
        }
      }
    ]
  });

  return page;
}
```

### Pattern 5: Handle Rate Limits

```javascript
async function notionRequestWithRetry(requestFn, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.code === "rate_limited") {
        retries++;
        const waitTime = Math.pow(2, retries) * 1000; // Exponential backoff
        console.log(`Rate limited. Waiting ${waitTime}ms before retry ${retries}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }

  throw new Error("Max retries exceeded");
}

// Usage
const page = await notionRequestWithRetry(() =>
  notion.pages.create({
    parent: { type: "data_source_id", data_source_id: "data-source-id" },
    properties: { /* ... */ }
  })
);
```

---

## Error Handling

### Error Response Structure

```javascript
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "body failed validation: body.properties.Status.select.name should be defined, instead was `undefined`."
}
```

### Common Error Codes

| Code | Status | Description | Solution |
|------|--------|-------------|----------|
| `validation_error` | 400 | Invalid request parameters | Check request body against docs |
| `unauthorized` | 401 | Invalid API key | Check authorization header |
| `restricted_resource` | 403 | No access to resource | Grant integration access to page |
| `object_not_found` | 404 | Resource doesn't exist | Verify IDs are correct |
| `conflict_error` | 409 | Edit conflict | Retry request |
| `rate_limited` | 429 | Too many requests | Implement exponential backoff |
| `internal_server_error` | 500 | Notion server error | Retry request |
| `service_unavailable` | 503 | Notion temporarily unavailable | Retry with backoff |

### Error Handling Pattern

```javascript
async function safeNotionRequest(requestFn) {
  try {
    return await requestFn();
  } catch (error) {
    if (error.code === "validation_error") {
      console.error("Validation error:", error.message);
      // Fix request parameters
    } else if (error.code === "unauthorized") {
      console.error("Unauthorized. Check API key.");
      // Update API key
    } else if (error.code === "restricted_resource") {
      console.error("No access. Grant integration permissions.");
      // Ask user to share page with integration
    } else if (error.code === "object_not_found") {
      console.error("Resource not found:", error.message);
      // Verify IDs
    } else if (error.code === "rate_limited") {
      console.error("Rate limited. Retrying...");
      // Implement retry with backoff
    } else {
      console.error("Unexpected error:", error);
      // Log and alert
    }

    throw error;
  }
}
```

---

## API Reference Quick Links

### Base URL
```
https://api.notion.com/v1
```

### Headers
```
Authorization: Bearer YOUR_API_SECRET
Notion-Version: 2025-09-03
Content-Type: application/json
```

### Endpoints Overview

**Databases:**
- `GET /v1/databases/:database_id` - Retrieve database
- `POST /v1/databases` - Create database
- `PATCH /v1/databases/:database_id` - Update database

**Data Sources:**
- `GET /v1/data_sources/:data_source_id` - Retrieve data source
- `POST /v1/data_sources/:data_source_id/query` - Query data source
- `PATCH /v1/data_sources/:data_source_id` - Update data source
- `GET /v1/data_sources/:data_source_id/templates` - List templates

**Pages:**
- `GET /v1/pages/:page_id` - Retrieve page
- `POST /v1/pages` - Create page
- `PATCH /v1/pages/:page_id` - Update page properties

**Blocks:**
- `GET /v1/blocks/:block_id` - Retrieve block
- `GET /v1/blocks/:block_id/children` - Retrieve block children
- `PATCH /v1/blocks/:block_id/children` - Append block children
- `PATCH /v1/blocks/:block_id` - Update block
- `DELETE /v1/blocks/:block_id` - Delete block

**Users:**
- `GET /v1/users/:user_id` - Retrieve user
- `GET /v1/users` - List all users
- `GET /v1/users/me` - Retrieve bot user

**Search:**
- `POST /v1/search` - Search workspace

**Comments:**
- `GET /v1/comments` - List comments
- `POST /v1/comments` - Create comment

---

## Changelog Summary

### Version 2025-09-03 (Current)

**Major Changes:**
- Multi-source database support
- `database_id` → `data_source_id` for most operations
- Database endpoints restructured
- New data source endpoints
- Webhook events updated for data sources

**Migration Required:**
1. Get `data_source_id` from database
2. Use `data_source_id` for page creation
3. Use `data_source_id` for relations
4. Update query/update endpoints to data sources
5. Handle search results as data sources
6. Update webhook event types

---

## SDK Examples

### Initialize Client

```javascript
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});
```

### Basic CRUD Operations

```javascript
// Create
const page = await notion.pages.create({ /* ... */ });

// Read
const page = await notion.pages.retrieve({ page_id: "page-id" });

// Update
await notion.pages.update({
  page_id: "page-id",
  properties: { /* ... */ }
});

// Delete
await notion.pages.update({
  page_id: "page-id",
  archived: true
});
```

### Working with Databases

```javascript
// Get database info
const db = await notion.databases.retrieve({
  database_id: "database-id"
});

// Get data source schema
const dataSource = await notion.dataSources.retrieve({
  data_source_id: db.data_sources[0].id
});

// Query data source
const response = await notion.dataSources.query({
  data_source_id: dataSource.id,
  filter: { /* ... */ },
  sorts: [ /* ... */ ]
});

// Create page in data source
const newPage = await notion.pages.create({
  parent: {
    type: "data_source_id",
    data_source_id: dataSource.id
  },
  properties: { /* ... */ }
});
```

---

## Appendix: Complete Examples

### Example 1: Task Manager Integration

```javascript
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function createTaskDatabase(parentPageId) {
  const database = await notion.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ text: { content: "My Tasks" } }],
    initial_data_source: {
      properties: {
        "Task": { title: {} },
        "Status": {
          select: {
            options: [
              { name: "Not Started", color: "gray" },
              { name: "In Progress", color: "yellow" },
              { name: "Completed", color: "green" }
            ]
          }
        },
        "Priority": {
          select: {
            options: [
              { name: "Low", color: "blue" },
              { name: "Medium", color: "yellow" },
              { name: "High", color: "red" }
            ]
          }
        },
        "Due Date": { date: {} },
        "Assignee": { people: {} },
        "Tags": { multi_select: {} }
      }
    },
    icon: { type: "emoji", emoji: "✅" }
  });

  return database;
}

async function addTask(dataSourceId, taskData) {
  const page = await notion.pages.create({
    parent: {
      type: "data_source_id",
      data_source_id: dataSourceId
    },
    properties: {
      "Task": {
        title: [{ text: { content: taskData.name } }]
      },
      "Status": {
        select: { name: taskData.status || "Not Started" }
      },
      "Priority": {
        select: { name: taskData.priority || "Medium" }
      },
      "Due Date": taskData.dueDate ? {
        date: { start: taskData.dueDate }
      } : undefined,
      "Tags": taskData.tags ? {
        multi_select: taskData.tags.map(tag => ({ name: tag }))
      } : undefined
    },
    children: taskData.description ? [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: taskData.description } }]
        }
      }
    ] : undefined
  });

  return page;
}

async function getIncompleteTasks(dataSourceId) {
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: {
      or: [
        {
          property: "Status",
          select: { equals: "Not Started" }
        },
        {
          property: "Status",
          select: { equals: "In Progress" }
        }
      ]
    },
    sorts: [
      { property: "Priority", direction: "ascending" },
      { property: "Due Date", direction: "ascending" }
    ]
  });

  return response.results;
}

async function completeTask(pageId) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      "Status": {
        select: { name: "Completed" }
      }
    }
  });

  // Add completion comment
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: "block",
        type: "callout",
        callout: {
          rich_text: [
            {
              text: {
                content: `✅ Completed on ${new Date().toLocaleDateString()}`
              }
            }
          ],
          icon: { type: "emoji", emoji: "🎉" },
          color: "green_background"
        }
      }
    ]
  });
}

// Usage
(async () => {
  // Create task database
  const db = await createTaskDatabase("parent-page-id");
  const dataSourceId = db.data_sources[0].id;

  // Add tasks
  await addTask(dataSourceId, {
    name: "Review API documentation",
    status: "In Progress",
    priority: "High",
    dueDate: "2025-01-20",
    tags: ["documentation", "api"],
    description: "Review and update the API documentation for v2"
  });

  // Get incomplete tasks
  const tasks = await getIncompleteTasks(dataSourceId);
  console.log(`Found ${tasks.length} incomplete tasks`);

  // Complete a task
  if (tasks.length > 0) {
    await completeTask(tasks[0].id);
  }
})();
```

---

## End of Knowledge Base

This knowledge base covers the essential concepts, patterns, and reference information needed to work with the Notion API effectively. Use it as a comprehensive guide for building integrations, automations, and tools that interact with Notion workspaces.

For the most up-to-date information, always refer to the official Notion API documentation at https://developers.notion.com.
