/** YAML template for the `basic` sample — three simple collections with realistic data. */
export const basicTemplate = `# yrest basic sample
# Run: npx @yrest/cli serve db.yml
# Docs: GET http://localhost:3070/_about

users:
  - id: 1
    name: Ana García
    email: ana@example.com
    role: admin
    active: true
  - id: 2
    name: Luis Martínez
    email: luis@example.com
    role: editor
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

products:
  - id: 1
    name: Laptop Pro 15
    price: 1299.99
    stock: 15
    category: electronics
    featured: true
  - id: 2
    name: Wireless Mouse
    price: 39.99
    stock: 80
    category: accessories
    featured: false
  - id: 3
    name: Mechanical Keyboard
    price: 129.99
    stock: 45
    category: accessories
    featured: true
  - id: 4
    name: 4K Monitor 27"
    price: 549.99
    stock: 20
    category: electronics
    featured: true
  - id: 5
    name: USB-C Hub 7-in-1
    price: 49.99
    stock: 100
    category: accessories
    featured: false

categories:
  - id: 1
    name: Electronics
    slug: electronics
    description: Laptops, monitors and computing gear
  - id: 2
    name: Accessories
    slug: accessories
    description: Peripherals and add-ons

# Try these queries:
#   GET /users?role=admin
#   GET /products?featured=true&_sort=price&_order=asc
#   GET /products?price_lte=100
#   GET /users?_q=garcia
#   GET /products?_fields=id,name,price&_page=1&_limit=3
`;
