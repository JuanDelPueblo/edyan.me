import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnifiedNav } from './unified_nav';

describe('UnifiedNav', () => {
	let component: UnifiedNav;
	let fixture: ComponentFixture<UnifiedNav>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [UnifiedNav]
		})
			.compileComponents();

		fixture = TestBed.createComponent(UnifiedNav);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
