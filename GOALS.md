# GOALS

## This repository

This repository is the catalog of catalog for all the *-atoms.com.  This repository should provide a value for aggregating all the sites together and 
giving profiles on what each site is.  The brand and theme should be the closest to finished products.
This file contains the "The Atom Site Spec" that all Atom sites should abide by.  If a site is existing and not following this pattern
you should create a plan, bet it approved explicetly and then migrate it.

Most sites wont come from the 

## Methods

- Use wrangler to identify all *-atoms.com sites
- Use the https://github.com/convergent-systems-co/go-tf-app-template as the template for atoms.convergent-systems.co
- Use the https://github.com/convergent-systems-co/astro-tf-app-template as the template for *-atoms.com
- Ask any clarifying questions required.
- Move all submodules under src/


## atoms.convergent-systems.co
- Should also have a go cli called atoms
- Should form a command structure that mirrors the *-atoms.com
  for example: atoms brand; atom theme; etc.. it will enable searching, listing, downloading, converting, etc.. 

## ATOM Site Spec

The normative Atom Spec lives at [`spec/atom-spec.md`](spec/atom-spec.md). It defines what every atom and every catalog MUST be (universal identity, URL convention, signing, versioning, references, trust). The umbrella site publishes it at `/spec/atom-spec.md` and (once signing keys are minted) `/spec/atom-spec.toml`.

