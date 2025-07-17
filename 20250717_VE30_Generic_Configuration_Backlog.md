# VE30 Generic Configuration Backlog

**Absolutely correct. VE30 architecture needs separation of concerns:**

**PROPOSED STRUCTURE:**

1. **CRUD Router** (`validation-crud-router.ts`) - Entity → storage method mapping
2. **VE30 Config** (`validation-engine-config.ts`) - Permission mapping + CRUD routing + package registry
3. **Package + Config** pattern - Each package includes its own config (permissions, CRUD methods, business rules)

**BENEFITS:**

- **True genericity** - Add new entities by config only
- **Clean separation** - VE30 engine stays pure, config handles mappings
- **External registry** - Packages self-contain all their requirements
- **Maintainable** - No hard-coded entity lists in engine core

**CURRENT PROBLEM:**  
VE30 has hard-coded `entityMethods` object = not generic, just a dispatcher.

**SOLUTION:**  
Move entity mapping to external config, VE30 becomes truly generic by loading entity definitions from registry.

Perfect architectural insight.