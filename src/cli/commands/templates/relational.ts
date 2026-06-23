/** YAML template for the `relational` sample — blog domain showcasing all three relation types. */
export const relationalTemplate = `# yrest relational sample — blog
# Demonstrates: many2one, one2one and many2many relationships
# Also shows __uuid_gen and __fk directives for UUID-based IDs
# Run: npx @yrest/cli serve db.yml
# Docs: GET http://localhost:3070/_about

_rel:
  # many2one — posts and comments belong to a user
  posts:
    userId: users
    # many2many — posts can have multiple tags via the post_tags pivot
    tags:
      _type: many2many
      _target: tags
      _through: post_tags
      _foreignKey: postId
      _otherKey: tagId
  comments:
    postId: posts
    userId: users

  # one2one — each user has exactly one profile
  profiles:
    userId:
      _type: one2one
      _target: users

# __uuid_gen:alias generates a UUID and registers it under that alias.
# __fk.collection:alias resolves to the UUID registered in that collection.
# yRest rewrites this file on first run, replacing all directives with real values.
users:
  - id: __uuid_gen:ana
    name: Ana García
    email: ana@example.com
    role: author
  - id: __uuid_gen:luis
    name: Luis Martínez
    email: luis@example.com
    role: author
  - id: __uuid_gen:sara
    name: Sara López
    email: sara@example.com
    role: reader

profiles:
  - id: __uuid_gen
    userId: __fk.users:ana
    bio: Full-stack developer and open-source enthusiast
    avatar: https://i.pravatar.cc/150?img=1
    website: https://ana.dev
  - id: __uuid_gen
    userId: __fk.users:luis
    bio: Backend engineer, coffee addict
    avatar: https://i.pravatar.cc/150?img=2
    website: https://luisdev.io
  - id: __uuid_gen
    userId: __fk.users:sara
    bio: Designer turned frontend developer
    avatar: https://i.pravatar.cc/150?img=3
    website: null

tags:
  - id: 1
    name: typescript
    color: "#3178c6"
  - id: 2
    name: api
    color: "#10b981"
  - id: 3
    name: testing
    color: "#f59e0b"
  - id: 4
    name: devtools
    color: "#8b5cf6"
  - id: 5
    name: yaml
    color: "#ef4444"

posts:
  - id: __uuid_gen:post-ts
    title: Getting started with TypeScript
    slug: getting-started-typescript
    body: TypeScript adds static typing to JavaScript, catching errors at compile time...
    userId: __fk.users:ana
    published: true
    views: 1420
    createdAt: "2024-11-01"
  - id: __uuid_gen:post-fastify
    title: Building REST APIs with Fastify
    slug: rest-apis-fastify
    body: Fastify is the fastest Node.js web framework, perfect for building APIs...
    userId: __fk.users:ana
    published: true
    views: 980
    createdAt: "2024-11-15"
  - id: __uuid_gen:post-testing
    title: Testing strategies for modern apps
    slug: testing-strategies-modern
    body: A solid test strategy covers unit, integration and end-to-end scenarios...
    userId: __fk.users:luis
    published: true
    views: 640
    createdAt: "2024-12-03"
  - id: __uuid_gen:post-yaml
    title: YAML as a database format
    slug: yaml-database-format
    body: YAML is human-readable and expressive enough for mock data during development...
    userId: __fk.users:luis
    published: false
    views: 0
    createdAt: "2025-01-10"

# pivot table for posts ↔ tags (many2many)
post_tags:
  - { id: 1, postId: __fk.posts:post-ts,      tagId: 1 }
  - { id: 2, postId: __fk.posts:post-ts,      tagId: 2 }
  - { id: 3, postId: __fk.posts:post-fastify, tagId: 2 }
  - { id: 4, postId: __fk.posts:post-fastify, tagId: 4 }
  - { id: 5, postId: __fk.posts:post-testing, tagId: 3 }
  - { id: 6, postId: __fk.posts:post-testing, tagId: 1 }
  - { id: 7, postId: __fk.posts:post-yaml,    tagId: 5 }
  - { id: 8, postId: __fk.posts:post-yaml,    tagId: 2 }

comments:
  - id: 1
    body: Great introduction! This helped me a lot.
    postId: __fk.posts:post-ts
    userId: __fk.users:sara
    likes: 5
  - id: 2
    body: Could you cover generics in a follow-up post?
    postId: __fk.posts:post-ts
    userId: __fk.users:luis
    likes: 3
  - id: 3
    body: Fastify is indeed much faster than Express in my benchmarks.
    postId: __fk.posts:post-fastify
    userId: __fk.users:sara
    likes: 8
  - id: 4
    body: Do you have a GitHub repo with these examples?
    postId: __fk.posts:post-fastify
    userId: __fk.users:ana
    likes: 1
  - id: 5
    body: E2E tests are underrated. Solid post!
    postId: __fk.posts:post-testing
    userId: __fk.users:ana
    likes: 4

# Try these queries:
#   GET /posts?published=true&_sort=views&_order=desc
#   GET /posts/1?_expand=user          → embeds author object
#   GET /users/1?_embed=posts          → embeds posts array
#   GET /users/1/profiles              → one2one nested route
#   GET /posts/1/tags                  → many2many nested route
#   GET /posts/1?_embed=tags           → many2many via ?_embed
#   GET /users/1?_embed=profiles       → one2one via ?_embed (returns object, not array)
`;
