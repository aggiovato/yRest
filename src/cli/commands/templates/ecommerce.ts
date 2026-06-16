/** YAML template for the `ecommerce` sample — full shop mock with relations and custom routes. */
export const ecommerceTemplate = `# yrest ecommerce sample
# Demonstrates: many2one, many2many, _routes with scenarios, template vars and delay
# Run: npx @yrest/cli serve db.yml
# Docs: GET http://localhost:3070/_about

_rel:
  # many2one
  orders:
    userId: users
  order_items:
    orderId: orders
    productId: products

  # many2many — products belong to multiple categories via pivot
  products:
    categories:
      _type: many2many
      _target: categories
      _through: product_categories
      _foreignKey: productId
      _otherKey: categoryId

_routes:
  # Login with conditional scenarios
  - _method: POST
    _path: /auth/login
    _scenarios:
      - _when:
          body.email: admin@example.com
          body.password: secret
        _response:
          _status: 200
          _body:
            token: tok-admin-abc123
            role: admin
            userId: 1
      - _when:
          body.email: user@example.com
          body.password: secret
        _response:
          _status: 200
          _body:
            token: tok-user-xyz789
            role: user
            userId: 2
    _otherwise:
      _status: 401
      _body:
        error: Invalid credentials

  # Logout — always 204
  - _method: POST
    _path: /auth/logout
    _response:
      _status: 204

  # Static featured products list
  - _method: GET
    _path: /store/featured
    _response:
      _status: 200
      _body:
        - id: 1
          name: Laptop Pro 15
          price: 1299.99
          badge: Best Seller
        - id: 4
          name: 4K Monitor 27"
          price: 549.99
          badge: New Arrival
        - id: 3
          name: Mechanical Keyboard
          price: 129.99
          badge: On Sale

  # Template variables — echoes the requested product id
  - _method: GET
    _path: /products/:id/summary
    _response:
      _status: 200
      _body:
        productId: "{{params.id}}"
        requestedAt: "{{now}}"
        source: mock

  # Cancel order with simulated latency and template vars
  - _method: POST
    _path: /orders/:id/cancel
    _delay: 500
    _response:
      _status: 200
      _body:
        orderId: "{{params.id}}"
        status: cancelled
        cancelledAt: "{{now}}"

  # Simulate a service outage for testing error handling
  - _method: GET
    _path: /store/inventory/sync
    _error: 503
    _errorBody:
      message: Inventory service temporarily unavailable
      retryAfter: 30

users:
  - id: 1
    name: Ana García
    email: admin@example.com
    role: admin
    active: true
  - id: 2
    name: Luis Martínez
    email: user@example.com
    role: user
    active: true
  - id: 3
    name: Sara López
    email: sara@example.com
    role: user
    active: true
  - id: 4
    name: Diego Ruiz
    email: diego@example.com
    role: user
    active: false

categories:
  - id: 1
    name: Laptops
    slug: laptops
  - id: 2
    name: Peripherals
    slug: peripherals
  - id: 3
    name: Monitors
    slug: monitors
  - id: 4
    name: Accessories
    slug: accessories

products:
  - id: 1
    name: Laptop Pro 15
    description: High-performance laptop for developers
    price: 1299.99
    stock: 15
    sku: LAP-001
    active: true
  - id: 2
    name: Wireless Mouse
    description: Ergonomic wireless mouse with USB-C receiver
    price: 39.99
    stock: 80
    sku: MOU-001
    active: true
  - id: 3
    name: Mechanical Keyboard
    description: Tactile switches, full RGB, TKL layout
    price: 129.99
    stock: 45
    sku: KEY-001
    active: true
  - id: 4
    name: 4K Monitor 27"
    description: IPS panel, 144Hz, HDR400
    price: 549.99
    stock: 20
    sku: MON-001
    active: true
  - id: 5
    name: USB-C Hub 7-in-1
    description: HDMI, SD card and USB-A ports
    price: 49.99
    stock: 100
    sku: HUB-001
    active: true

# pivot table for products ↔ categories (many2many)
product_categories:
  - { id: 1, productId: 1, categoryId: 1 }
  - { id: 2, productId: 2, categoryId: 2 }
  - { id: 3, productId: 2, categoryId: 4 }
  - { id: 4, productId: 3, categoryId: 2 }
  - { id: 5, productId: 3, categoryId: 4 }
  - { id: 6, productId: 4, categoryId: 3 }
  - { id: 7, productId: 5, categoryId: 4 }

orders:
  - id: 1
    userId: 2
    status: delivered
    total: 1339.98
    createdAt: "2024-12-10"
  - id: 2
    userId: 3
    status: processing
    total: 179.98
    createdAt: "2025-01-15"
  - id: 3
    userId: 2
    status: pending
    total: 549.99
    createdAt: "2025-02-01"

order_items:
  - { id: 1, orderId: 1, productId: 1, quantity: 1, unitPrice: 1299.99 }
  - { id: 2, orderId: 1, productId: 2, quantity: 1, unitPrice:   39.99 }
  - { id: 3, orderId: 2, productId: 3, quantity: 1, unitPrice:  129.99 }
  - { id: 4, orderId: 2, productId: 2, quantity: 1, unitPrice:   39.99 }
  - { id: 5, orderId: 3, productId: 4, quantity: 1, unitPrice:  549.99 }

# Try these queries:
#   POST /auth/login       { "email": "admin@example.com", "password": "secret" }
#   GET  /store/featured
#   GET  /products/1/summary
#   GET  /products/1/categories              → many2many nested route
#   GET  /products/1?_embed=categories       → many2many via ?_embed
#   GET  /users/2?_embed=orders              → many2one ?_embed
#   GET  /users/2/orders                     → nested route
#   GET  /orders/1?_embed=order_items        → nested items
#   POST /orders/1/cancel                    → delayed response with template vars
#   GET  /store/inventory/sync               → forced 503 error
`;
