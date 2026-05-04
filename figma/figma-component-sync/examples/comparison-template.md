# Component Comparison: EditableText

> Figma: https://www.figma.com/design/7QW0kJ07DcM36mgQUJ5Dtj/Carton-Case-Management?node-id=1261-9396

## Differences

### 📁 EditableText.tsx

#### 1. Input Shadow
- **Figma:** `shadow-xs` (0px 1px 2px rgba(0,0,0,0.05))
- **Code:** `shadow-sm`
- **Impact:** Low

**Decision:**
- [ ] 🔧 IMPLEMENT
- [ ] ✅ ACCEPT - Reason: 
- [ ] ⏭️ SKIP

---

### 📁 BaseEditable.tsx (dependency)

⚠️ Changes affect all inline-edit components

#### 1. Label-Content Gap
- **Figma:** `0px` (no gap)
- **Code:** `gap-1` (4px)
- **Impact:** Low

**Decision:**
- [ ] 🔧 IMPLEMENT
- [ ] ✅ ACCEPT - Reason: 
- [ ] ⏭️ SKIP

#### 2. Content Padding
- **Figma:** `py-2` (8px)
- **Code:** `py-0.5` (2px)
- **Impact:** Medium

**Decision:**
- [ ] 🔧 IMPLEMENT
- [ ] ✅ ACCEPT - Reason: 
- [ ] ⏭️ SKIP

#### 3. Content Font Weight
- **Figma:** `font-medium` (500)
- **Code:** inherited (400)
- **Impact:** Low

**Decision:**
- [ ] 🔧 IMPLEMENT
- [ ] ✅ ACCEPT - Reason: 
- [ ] ⏭️ SKIP

---

## Previously Accepted

| Category | Figma | Code | File | Reason |
|----------|-------|------|------|--------|
| Content Height | `h-9` (36px) | auto | BaseEditable.tsx | Flexible content support |
